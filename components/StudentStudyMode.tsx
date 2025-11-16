import React, { useMemo, useState, useEffect } from 'react';
import { Assignment, Submission, TeachingMaterial, UserProfile, QuizQuestion, GES_SUBJECTS } from '../types';
import FocusTimer from './FocusTimer';
import Card from './common/Card';
import AIAssistant from './AIAssistant';
import Button from './common/Button';
import Spinner from './common/Spinner';
import TTSAudioPlayer from './common/TTSAudioPlayer';
import { GoogleGenAI, Type, Modality } from '@google/genai';

interface StudentStudyModeProps {
  onExit: () => void;
  userProfile: UserProfile;
  assignments: Assignment[];
  submissions: Record<string, Submission>;
  learningMaterials: TeachingMaterial[];
}

// --- Local Types for this component ---
interface LearningSection {
  title: string;
  explanation: string; // HTML content
  imagePrompt: string;
}

interface LearningModule {
  title: string;
  introduction: string;
  sections: LearningSection[];
  quiz: QuizQuestion[];
}
// --- End of Local Types ---

const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
};

const StudentStudyMode: React.FC<StudentStudyModeProps> = ({ onExit, userProfile }) => {
  const [completedSessions, setCompletedSessions] = useState(0);
  const [aiSystemInstruction, setAiSystemInstruction] = useState('');
  
  // State for the "Learning Hub"
  const [learningHubStep, setLearningHubStep] = useState<'form' | 'interests' | 'learning'>('form');
  const [learningModule, setLearningModule] = useState<LearningModule | null>(null);
  const [moduleImages, setModuleImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [exploreSubject, setExploreSubject] = useState(GES_SUBJECTS[0]);
  const [exploreTopic, setExploreTopic] = useState('');
  const [interestSuggestions, setInterestSuggestions] = useState<string[]>([]);
  const [selectedInterest, setSelectedInterest] = useState<string | null>(null);
  
  // Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const handleSessionComplete = () => {
    setCompletedSessions(prev => prev + 1);
  };

  useEffect(() => {
    const baseInstruction = `You are an AI assistant for a student in 'Study Mode'. Your role is to help them with their learning. Maintain a supportive and encouraging tone. Guide the student with hints and explanations, but do not provide direct answers to assignments. As a bilingual AI, you can also be 'Kofi AI'. If a user speaks Twi, respond as Kofi AI in fluent Asante Twi, using correct grammar and letters like 'ɛ' and 'ɔ'.`;
    
    let context = '';
    if (learningHubStep === 'learning' && exploreTopic) {
        context = `The student is currently learning about the topic '${exploreTopic}' in the subject '${exploreSubject}'. Answer any questions they have related to this topic, and help them understand it better.`;
    } else {
        context = "The student is in their general study session. Encourage them to pick a topic to learn about or to focus on their work.";
    }
    
    setAiSystemInstruction(`${baseInstruction}\n\nCURRENT CONTEXT:\n${context}`);
  }, [learningHubStep, exploreTopic, exploreSubject]);
  
  const handleExploreTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exploreTopic.trim() || !exploreSubject) return;
    setIsProcessing(true);
    setError('');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `For a student in class '${userProfile.class}' studying the topic '${exploreTopic}' in '${exploreSubject}', suggest 3 to 5 relatable and fun interests (like specific video games, hobbies, food, or sports) that can be used as an analogy to explain the topic. Return only a valid JSON object with a single key 'interests' which is an array of strings.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        interests: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['interests']
                }
            }
        });
        const result = JSON.parse(response.text);
        setInterestSuggestions(result.interests);
        setLearningHubStep('interests');
    } catch (err) {
        console.error("Interest generation failed, falling back.", err);
        handleGenerateModule("Just the facts");
    } finally {
        setIsProcessing(false);
    }
  };


  const handleGenerateModule = async (interest: string) => {
    if (!exploreTopic.trim() || !exploreSubject) return;

    setSelectedInterest(interest);
    setIsProcessing(true);
    setLearningModule(null);
    setModuleImages([]);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setError('');
    setLearningHubStep('learning');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const interestAnalogy = interest === "Just the facts"
          ? "Explain the topic clearly and directly."
          : `Use the interest '${interest}' as a central theme or creative analogy throughout the explanation and examples to make the topic engaging and easier to understand.`;
          
      const prompt = `You are an expert tutor AI named Edu. A student in class '${userProfile.class}' wants a comprehensive lesson on the topic '${exploreTopic}' in the subject '${exploreSubject}'.
      ${interestAnalogy}
      Create a full learning module with the following structure:
      1.  **title**: A short, engaging title for the learning module.
      2.  **introduction**: A brief, one-paragraph introduction that hooks the reader, using the analogy if one was provided.
      3.  **sections**: An array of 3-5 learning sections. Each section must have:
          a.  'title': A sub-topic title.
          b.  'explanation': A detailed explanation of the sub-topic formatted as an HTML string (using <p>, <strong>, <ul>, <li>).
          c.  'imagePrompt': A creative, descriptive prompt for an image generation AI that visually represents this section's content.
      4.  **quiz**: A 3-question multiple-choice quiz based on the content. Each question must have a 'question', an array of 4 'options', and the 'correctAnswer'.
      
      Your response MUST be a single, valid JSON object that strictly follows the provided schema.`;

      const learningModuleSchema = {
          type: Type.OBJECT,
          properties: {
              title: { type: Type.STRING },
              introduction: { type: Type.STRING },
              sections: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          title: { type: Type.STRING },
                          explanation: { type: Type.STRING },
                          imagePrompt: { type: Type.STRING },
                      },
                      required: ['title', 'explanation', 'imagePrompt']
                  }
              },
              quiz: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          question: { type: Type.STRING },
                          options: { type: Type.ARRAY, items: { type: Type.STRING } },
                          correctAnswer: { type: Type.STRING }
                      },
                      required: ['question', 'options', 'correctAnswer']
                  }
              }
          },
          required: ['title', 'introduction', 'sections', 'quiz']
      };

      const textResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: learningModuleSchema
        }
      });
      
      const moduleData = JSON.parse(textResponse.text) as LearningModule;
      setLearningModule(moduleData); // Set text content first so UI can render placeholders

      // Generate images in parallel
      const imagePromises = moduleData.sections.map(section => 
        ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: section.imagePrompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        })
      );

      const imageResponses = await Promise.all(imagePromises);

      const imageUrls = imageResponses.map(res => {
          const parts = res.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
              if (part.inlineData) {
                  return `data:image/png;base64,${part.inlineData.data}`;
              }
          }
          return ''; // Return empty string if no image was generated
      });

      setModuleImages(imageUrls);

    } catch (err: any) {
      console.error(`AI Explore Error:`, err);
      setError('Sorry, I was unable to generate a learning module for that topic. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };


  const handleQuizAnswer = (questionIndex: number, answer: string) => {
    setQuizAnswers(prev => ({ ...prev, [questionIndex]: answer }));
    setQuizSubmitted(false);
  };
  const handleSubmitQuiz = () => {
    setQuizSubmitted(true);
  };

  const handleStartOver = () => {
    setLearningHubStep('form');
    setLearningModule(null);
    setModuleImages([]);
    setError('');
    setExploreTopic('');
    setInterestSuggestions([]);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-50 flex flex-col p-4 sm:p-8 animate-fade-in-short">
      <header className="flex justify-between items-center flex-shrink-0 mb-6">
        <h1 className="text-2xl font-bold text-blue-300">AI Learning Hub</h1>
        <button onClick={onExit} className="px-4 py-2 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors">Exit</button>
      </header>

      <main className="flex-grow overflow-y-auto space-y-6 max-w-4xl w-full mx-auto pr-2">
        {/* Learning Hub */}
        <Card>
          {learningHubStep === 'form' && (
            <form onSubmit={handleExploreTopic} className="space-y-4 animate-fade-in-short">
                <h2 className="text-xl font-bold">Learning Hub</h2>
                <p className="text-sm text-gray-400">What do you want to learn about today?</p>
                <div>
                    <label className="text-sm text-gray-300">Subject</label>
                    <select value={exploreSubject} onChange={e => setExploreSubject(e.target.value)} className="w-full p-2 mt-1 bg-slate-700 rounded-md">
                        {GES_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-sm text-gray-300">Topic</label>
                    <input type="text" value={exploreTopic} onChange={e => setExploreTopic(e.target.value)} placeholder="e.g., Photosynthesis, The Trans-Saharan Trade" required className="w-full p-2 mt-1 bg-slate-700 rounded-md"/>
                </div>
                <Button type="submit" disabled={isProcessing}>
                    {isProcessing ? 'Thinking...' : 'Find a Fun Way to Learn'}
                </Button>
                {error && <p className="text-red-400 text-sm">{error}</p>}
            </form>
          )}

          {learningHubStep === 'interests' && (
            <div className="animate-fade-in-short text-center">
                <h2 className="text-xl font-bold">Choose a Learning Style</h2>
                <p className="text-sm text-gray-400 my-4">How would you like to learn about <strong>{exploreTopic}</strong>? Pick an interest to use as an analogy.</p>
                <div className="flex flex-wrap gap-3 justify-center">
                    {interestSuggestions.map(interest => (
                        <Button key={interest} onClick={() => handleGenerateModule(interest)} variant="secondary">
                            {interest}
                        </Button>
                    ))}
                    <Button onClick={() => handleGenerateModule("Just the facts")}>
                        Just the Facts
                    </Button>
                </div>
            </div>
          )}

          {learningHubStep === 'learning' && (
             <div className="animate-fade-in-short">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">{learningModule?.title || exploreTopic}</h2>
                    <Button variant="secondary" size="sm" onClick={handleStartOver}>&larr; Learn Another Topic</Button>
                </div>
                {isProcessing && !learningModule && (
                    <div className="flex flex-col items-center justify-center p-8">
                        <Spinner />
                        <p className="mt-4 text-gray-400">Generating your personalized lesson...</p>
                    </div>
                )}
                 <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-2">
                    {learningModule && (
                        <>
                            <p className="italic text-gray-300">{learningModule.introduction}</p>
                            {learningModule.sections.map((section, index) => (
                                <div key={index} className={`grid md:grid-cols-2 gap-6 items-center border-t border-slate-700 pt-6`}>
                                    <div className={`aspect-video bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden ${index % 2 === 1 ? 'md:order-last' : ''}`}>
                                        {moduleImages[index] ? (
                                            <img src={moduleImages[index]} alt={section.title} className="w-full h-full object-cover image-fade-in" />
                                        ) : (
                                            <div className="w-full h-full shimmer-bg"></div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-blue-300">{section.title}</h3>
                                            <TTSAudioPlayer textToSpeak={stripHtml(`${section.title}. ${section.explanation}`)} />
                                        </div>
                                        <div className="prose-styles prose-invert text-sm" dangerouslySetInnerHTML={{ __html: section.explanation }} />
                                    </div>
                                </div>
                            ))}
                             <div>
                                <h3 className="text-xl font-bold text-blue-300 border-b border-blue-400/50 pb-2 mb-4">Test Your Knowledge</h3>
                                <div className="space-y-4">
                                    {learningModule.quiz.map((q, i) => (
                                        <div key={i}>
                                            <p className="font-semibold mb-2">{i+1}. {q.question}</p>
                                            <div className="space-y-2">
                                                {q.options.map((opt, optIndex) => {
                                                    const isSelected = quizAnswers[i] === opt;
                                                    let bgColor = 'bg-slate-700 hover:bg-slate-600';
                                                    if (quizSubmitted) {
                                                        if (opt === q.correctAnswer) bgColor = 'bg-green-800/80 border border-green-600';
                                                        else if (isSelected) bgColor = 'bg-red-800/80 border border-red-600';
                                                    } else if (isSelected) {
                                                        bgColor = 'bg-blue-800/80 border border-blue-600';
                                                    }
                                                    return (
                                                        <button key={optIndex} onClick={() => handleQuizAnswer(i, opt)} disabled={quizSubmitted} className={`w-full text-left p-2 rounded-md transition-colors ${bgColor}`}>
                                                          {opt}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                    <Button onClick={handleSubmitQuiz} disabled={Object.keys(quizAnswers).length !== learningModule.quiz.length} className="mt-4">
                                      {quizSubmitted ? 'Answers Shown' : 'Check Answers'}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                 </div>
             </div>
          )}
        </Card>

        {/* Focus Timer & AI Assistant can be secondary, so they are lower */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <FocusTimer onSessionComplete={handleSessionComplete} />
                <p className="text-center mt-4 text-sm text-gray-400">Focus Sessions Completed: <span className="font-bold text-white">{completedSessions}</span></p>
            </Card>
            <Card className="h-96">
                <AIAssistant systemInstruction={aiSystemInstruction} isEmbedded={true} />
            </Card>
        </div>
      </main>
    </div>
  );
};

export default StudentStudyMode;
