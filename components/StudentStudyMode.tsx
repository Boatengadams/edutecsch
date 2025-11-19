
import React, { useMemo, useState, useEffect, useRef } from 'react';
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
  quiz: {
      question: string;
      options: string[];
      correctAnswer: string;
      explanation: string;
  }[];
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
  const [learningHubStep, setLearningHubStep] = useState<'form' | 'interests' | 'module'>('form');
  const [moduleStep, setModuleStep] = useState(0); // 0 = Intro, 1...N = Sections, N+1 = Quiz
  
  const [learningModule, setLearningModule] = useState<LearningModule | null>(null);
  const [moduleImages, setModuleImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [exploreSubject, setExploreSubject] = useState(GES_SUBJECTS[0]);
  const [exploreTopic, setExploreTopic] = useState('');
  const [interestSuggestions, setInterestSuggestions] = useState<string[]>([]);
  const [selectedInterest, setSelectedInterest] = useState<string | null>(null);
  
  // Feature states
  const [simplifyingSection, setSimplifyingSection] = useState(false);
  
  // Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizScore, setQuizScore] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);

  const handleSessionComplete = () => {
    setCompletedSessions(prev => prev + 1);
    setSessionXP(prev => prev + 50); // Bonus for focus session
  };

  useEffect(() => {
    const baseInstruction = `You are an AI assistant for a student in 'Study Mode'. Your role is to help them with their learning. Maintain a supportive and encouraging tone. Guide the student with hints and explanations, but do not provide direct answers to assignments. As a bilingual AI, you can also be 'Kofi AI'. If a user speaks Twi, respond as Kofi AI in fluent Asante Twi, using correct grammar and letters like 'ɛ' and 'ɔ'.`;
    
    let context = '';
    if (learningHubStep === 'module' && exploreTopic) {
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
            model: 'gemini-3-pro-preview',
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
    setQuizScore(0);
    setSessionXP(0);
    setModuleStep(0);
    setError('');
    setLearningHubStep('module');

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
          b.  'explanation': A detailed explanation of the sub-topic formatted as an HTML string (using <p>, <strong>, <ul>, <li>). Keep it suitable for the student's level.
          c.  'imagePrompt': A creative, descriptive prompt for an image generation AI that visually represents this section's content.
      4.  **quiz**: A 3-question multiple-choice quiz based on the content. Each question must have a 'question', an array of 4 'options', the 'correctAnswer', and a brief 'explanation' of why that answer is correct.
      
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
                          correctAnswer: { type: Type.STRING },
                          explanation: { type: Type.STRING },
                      },
                      required: ['question', 'options', 'correctAnswer', 'explanation']
                  }
              }
          },
          required: ['title', 'introduction', 'sections', 'quiz']
      };

      const textResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: learningModuleSchema
        }
      });
      
      const moduleData = JSON.parse(textResponse.text) as LearningModule;
      setLearningModule(moduleData); 

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

  const handleSimplifySection = async (sectionIndex: number) => {
      if (!learningModule) return;
      setSimplifyingSection(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const section = learningModule.sections[sectionIndex];
          const prompt = `Rewrite the following educational explanation to be simpler, easier to understand, and more concise for a student in class ${userProfile.class}. Use bullet points where appropriate. Format as HTML.
          
          Original Text:
          ${section.explanation}`;

          const response = await ai.models.generateContent({
              model: 'gemini-3-pro-preview',
              contents: prompt,
          });
          
          const simplifiedText = response.text;
          
          // Update local state
          const newModule = { ...learningModule };
          newModule.sections[sectionIndex].explanation = simplifiedText;
          setLearningModule(newModule);

      } catch (err) {
          console.error("Simplification failed", err);
      } finally {
          setSimplifyingSection(false);
      }
  };

  const handleQuizAnswer = (questionIndex: number, answer: string) => {
    if (quizAnswers[questionIndex]) return; // Prevent re-answering
    
    setQuizAnswers(prev => ({ ...prev, [questionIndex]: answer }));
    
    if (learningModule && answer === learningModule.quiz[questionIndex].correctAnswer) {
        setQuizScore(prev => prev + 1);
        setSessionXP(prev => prev + 20); // XP for correct answer
    } else {
        setSessionXP(prev => prev + 5); // Small XP for effort
    }
  };

  const handleNextStep = () => {
      setModuleStep(prev => prev + 1);
      setSessionXP(prev => prev + 10); // XP for progression
  };

  const handlePrevStep = () => {
      setModuleStep(prev => Math.max(0, prev - 1));
  };

  const handleStartOver = () => {
    setLearningHubStep('form');
    setLearningModule(null);
    setModuleImages([]);
    setError('');
    setExploreTopic('');
    setInterestSuggestions([]);
  };

  // --- Render Helpers ---

  const renderProgressBar = () => {
      if (!learningModule) return null;
      const totalSteps = learningModule.sections.length + 2; // Intro + Sections + Quiz
      const progress = ((moduleStep + 1) / totalSteps) * 100;
      
      return (
          <div className="w-full h-2 bg-slate-800 rounded-full mb-6 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
          </div>
      );
  };

  const renderContent = () => {
      if (isProcessing || !learningModule) return null;
      
      // 1. Introduction Step
      if (moduleStep === 0) {
          return (
              <div className="flex flex-col h-full animate-fade-in-short">
                  <div className="flex-grow flex flex-col justify-center items-center text-center space-y-6 p-8">
                      <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center text-4xl mb-4 animate-bounce">
                          🚀
                      </div>
                      <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300">{learningModule.title}</h2>
                      <p className="text-lg text-slate-300 max-w-2xl leading-relaxed">{learningModule.introduction}</p>
                  </div>
                  <div className="flex justify-end mt-4">
                      <Button onClick={handleNextStep} size="lg" className="w-full md:w-auto shadow-lg shadow-blue-500/30">Let's Start!</Button>
                  </div>
              </div>
          );
      }

      // 2. Section Steps
      const sectionIndex = moduleStep - 1;
      if (sectionIndex < learningModule.sections.length) {
          const section = learningModule.sections[sectionIndex];
          return (
              <div className="flex flex-col h-full animate-fade-in-short">
                  <div className="grid lg:grid-cols-2 gap-8 h-full">
                        {/* Visual Side */}
                       <div className="bg-slate-800 rounded-2xl overflow-hidden relative shadow-2xl group border border-slate-700/50">
                            {moduleImages[sectionIndex] ? (
                                <img src={moduleImages[sectionIndex]} alt={section.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            ) : (
                                <div className="w-full h-full shimmer-bg flex items-center justify-center text-slate-500">Generating Visual...</div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-transparent p-6 pt-20">
                                <h3 className="text-2xl font-bold text-white">{section.title}</h3>
                            </div>
                       </div>
                       
                       {/* Content Side */}
                       <div className="flex flex-col">
                           <div className="flex-grow bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 overflow-y-auto custom-scrollbar">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex gap-2">
                                        <TTSAudioPlayer textToSpeak={stripHtml(section.explanation)} />
                                        <button onClick={() => handleSimplifySection(sectionIndex)} disabled={simplifyingSection} className="text-xs text-blue-300 hover:text-white bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/30 transition-colors">
                                            {simplifyingSection ? 'Simplifying...' : '✨ Simplify'}
                                        </button>
                                    </div>
                                </div>
                                <div className="prose-styles prose-invert text-lg leading-relaxed text-slate-200" dangerouslySetInnerHTML={{ __html: section.explanation }} />
                           </div>
                           <div className="flex justify-between mt-6 pt-4 border-t border-slate-800">
                               <Button variant="secondary" onClick={handlePrevStep}>Back</Button>
                               <Button onClick={handleNextStep}>Next &rarr;</Button>
                           </div>
                       </div>
                  </div>
              </div>
          );
      }

      // 3. Quiz Step
      return (
          <div className="flex flex-col h-full animate-fade-in-short max-w-3xl mx-auto w-full">
              <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Knowledge Check</h2>
                  <p className="text-slate-400">Test what you've learned to earn XP!</p>
              </div>
              
              <div className="flex-grow space-y-6 overflow-y-auto pr-2">
                  {learningModule.quiz.map((q, i) => {
                      const userAnswer = quizAnswers[i];
                      const isCorrect = userAnswer === q.correctAnswer;
                      
                      return (
                          <div key={i} className={`p-6 rounded-xl border transition-all duration-300 ${userAnswer ? (isCorrect ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50') : 'bg-slate-800 border-slate-700'}`}>
                              <p className="text-lg font-semibold mb-4">{i + 1}. {q.question}</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {q.options.map((opt, optIndex) => {
                                      let btnClass = "p-3 rounded-lg text-left transition-all duration-200 border border-transparent ";
                                      if (userAnswer) {
                                          if (opt === q.correctAnswer) btnClass += "bg-green-600 text-white shadow-lg shadow-green-900/20";
                                          else if (opt === userAnswer) btnClass += "bg-red-600 text-white opacity-80";
                                          else btnClass += "bg-slate-700 opacity-50";
                                      } else {
                                          btnClass += "bg-slate-700 hover:bg-slate-600 hover:border-slate-500";
                                      }
                                      
                                      return (
                                          <button 
                                            key={optIndex} 
                                            onClick={() => handleQuizAnswer(i, opt)} 
                                            disabled={!!userAnswer} 
                                            className={btnClass}
                                          >
                                              {opt}
                                          </button>
                                      );
                                  })}
                              </div>
                              {userAnswer && (
                                  <div className={`mt-4 p-3 rounded-lg text-sm ${isCorrect ? 'text-green-300 bg-green-500/10' : 'text-red-300 bg-red-500/10'}`}>
                                      <strong>{isCorrect ? 'Correct!' : 'Not quite.'}</strong> {q.explanation}
                                  </div>
                              )}
                          </div>
                      );
                  })}
              </div>
              
              <div className="mt-6 flex justify-between items-center pt-6 border-t border-slate-800">
                   <div className="text-sm text-gray-400">
                       XP Earned: <span className="text-yellow-400 font-bold">+{sessionXP}</span>
                   </div>
                   <div className="flex gap-3">
                        <Button variant="secondary" onClick={handlePrevStep}>Review Lesson</Button>
                        <Button onClick={handleStartOver} disabled={Object.keys(quizAnswers).length < learningModule.quiz.length}>Finish & New Topic</Button>
                   </div>
              </div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col">
      <header className="flex justify-between items-center p-4 sm:px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                🎓
            </div>
            <h1 className="text-xl font-bold text-slate-200">AI Learning Hub</h1>
        </div>
        <div className="flex items-center gap-4">
             {learningModule && <div className="hidden sm:block text-sm font-medium text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full">✨ {sessionXP} XP</div>}
             <button onClick={onExit} className="text-slate-400 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
             </button>
        </div>
      </header>

      <main className="flex-grow overflow-hidden relative flex flex-col">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
             <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-3xl"></div>
             <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 flex-grow p-4 sm:p-8 max-w-7xl w-full mx-auto flex flex-col">
            {learningHubStep === 'form' && (
                <div className="flex-grow flex flex-col justify-center items-center max-w-2xl mx-auto w-full animate-fade-in-up">
                    <h2 className="text-3xl sm:text-4xl font-bold text-center mb-2">What do you want to learn?</h2>
                    <p className="text-slate-400 text-center mb-8">Enter a topic and subject, and we'll create a personalized lesson for you.</p>
                    
                    <Card className="w-full p-6 sm:p-8 shadow-2xl border-slate-700/50">
                        <form onSubmit={handleExploreTopic} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Subject</label>
                                <select value={exploreSubject} onChange={e => setExploreSubject(e.target.value)} className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                                    {GES_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Topic</label>
                                <input type="text" value={exploreTopic} onChange={e => setExploreTopic(e.target.value)} placeholder="e.g., Photosynthesis, The Gold Coast" required className="w-full p-3 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"/>
                            </div>
                            <Button type="submit" disabled={isProcessing} className="w-full py-3 text-lg shadow-lg shadow-blue-600/20">
                                {isProcessing ? <span className="flex items-center gap-2"><Spinner/> Thinking...</span> : 'Start Learning Adventure'}
                            </Button>
                        </form>
                    </Card>
                     {error && <p className="text-red-400 mt-4 bg-red-500/10 px-4 py-2 rounded-lg">{error}</p>}
                </div>
            )}

            {learningHubStep === 'interests' && (
                <div className="flex-grow flex flex-col justify-center items-center w-full animate-fade-in-up">
                    <h2 className="text-3xl font-bold text-center mb-2">Choose Your Path</h2>
                    <p className="text-slate-400 text-center mb-10">How would you like to explore <strong>{exploreTopic}</strong>?</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                        {interestSuggestions.map((interest, idx) => (
                            <button key={interest} onClick={() => handleGenerateModule(interest)} className="group relative h-48 bg-slate-800 rounded-2xl border border-slate-700 p-6 flex flex-col justify-end items-start hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 text-left overflow-hidden">
                                <div className={`absolute top-0 right-0 p-20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors`}></div>
                                <div className="relative z-10">
                                    <span className="text-4xl mb-2 block">{['🎮', '⚽', '🎵', '🚀'][idx % 4]}</span>
                                    <h3 className="font-bold text-lg text-white group-hover:text-blue-300 transition-colors">{interest}</h3>
                                    <p className="text-xs text-gray-500 mt-1 group-hover:text-gray-400">Learn through this analogy</p>
                                </div>
                            </button>
                        ))}
                        <button onClick={() => handleGenerateModule("Just the facts")} className="group h-48 bg-slate-800/50 border border-slate-700 border-dashed rounded-2xl p-6 flex flex-col justify-center items-center hover:bg-slate-800 hover:border-slate-500 transition-all">
                            <span className="text-3xl mb-2">📝</span>
                            <h3 className="font-bold text-gray-300 group-hover:text-white">Just the Facts</h3>
                        </button>
                    </div>
                </div>
            )}

            {learningHubStep === 'module' && (
                 <div className="flex flex-col h-full max-w-6xl mx-auto w-full">
                    {renderProgressBar()}
                    {isProcessing && !learningModule ? (
                        <div className="flex-grow flex flex-col items-center justify-center">
                             <div className="relative">
                                <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center font-bold text-xs">Edu</div>
                             </div>
                            <p className="mt-6 text-xl font-medium text-slate-300 animate-pulse">Crafting your lesson on {exploreTopic}...</p>
                            <p className="text-sm text-slate-500 mt-2">Generating analogies, visuals, and quiz questions.</p>
                        </div>
                    ) : (
                        renderContent()
                    )}
                 </div>
            )}
        </div>

        {/* Minimized AI Assistant / Timer */}
        {learningHubStep !== 'module' && (
             <div className="absolute bottom-4 right-4 z-20 flex gap-4">
                <Card className="!p-3 !bg-slate-900/80 backdrop-blur-md border-slate-800 w-auto">
                     <FocusTimer onSessionComplete={handleSessionComplete} />
                </Card>
            </div>
        )}
        {/* Hidden AI Assistant for context */}
        <div className="hidden">
            <AIAssistant systemInstruction={aiSystemInstruction} isEmbedded={true} />
        </div>
      </main>
    </div>
  );
};

export default StudentStudyMode;
