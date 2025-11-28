
export const BECE_SUBJECTS = [
    'Integrated Science',
    'Mathematics',
    'English Language',
    'Social Studies',
    'Religious and Moral Education',
    'Basic Design and Technology',
    'I.C.T',
    'French',
    'Ghanaian Language',
    'Career Technology',
    'Creative Arts and Design',
    'Computing',
];

export const beceDiagrams: { [key: string]: string } = {
  'is_2025_q1a_cycle': `
    <div class="my-4 flex justify-center bg-white p-4 rounded-lg border border-gray-200">
      <svg width="550" height="450" viewBox="0 0 550 450" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#333" />
          </marker>
        </defs>
        <ellipse cx="275" cy="60" rx="60" ry="30" fill="#e0f2fe" stroke="#0284c7" stroke-width="2" />
        <text x="275" y="65" text-anchor="middle" font-weight="bold" font-size="16">B</text>
        <ellipse cx="100" cy="225" rx="50" ry="30" fill="#dcfce7" stroke="#166534" stroke-width="2" />
        <text x="100" y="230" text-anchor="middle" font-weight="bold" font-size="16">A</text>
        <ellipse cx="275" cy="225" rx="50" ry="30" fill="#fef3c7" stroke="#d97706" stroke-width="2" />
        <text x="275" y="230" text-anchor="middle" font-weight="bold" font-size="16">C</text>
        <ellipse cx="275" cy="340" rx="50" ry="30" fill="#f3f4f6" stroke="#4b5563" stroke-width="2" />
        <text x="275" y="345" text-anchor="middle" font-weight="bold" font-size="16">D</text>
        <ellipse cx="275" cy="410" rx="40" ry="20" fill="#444" stroke="black" stroke-width="1" />
        <text x="275" y="415" text-anchor="middle" fill="white" font-size="12">Fossil fuel</text>
        <ellipse cx="450" cy="225" rx="60" ry="35" fill="#cbd5e1" stroke="#334155" stroke-width="2" />
        <text x="450" y="220" text-anchor="middle" font-weight="bold" font-size="14">Factories/</text>
        <text x="450" y="240" text-anchor="middle" font-weight="bold" font-size="14">Industries</text>
        <path d="M120 190 Q 150 100 220 70" fill="none" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)" stroke-dasharray="5,5" />
        <path d="M215 60 Q 120 80 100 195" fill="none" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)" />
        <text x="130" y="130" font-weight="bold" font-size="16" fill="#333">P</text>
        <path d="M275 195 L 275 90" fill="none" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)" />
        <text x="285" y="140" font-weight="bold" font-size="16" fill="#333">Q</text>
        <text x="340" y="140" text-anchor="middle" font-size="10" fill="#666" font-style="italic">(animal respiration)</text>
        <path d="M275 255 L 275 300" fill="none" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)" />
        <path d="M130 245 Q 160 320 225 340" fill="none" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)" />
        <text x="160" y="310" font-weight="bold" font-size="16" fill="#333">S</text>
        <path d="M450 190 Q 450 80 335 60" fill="none" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)" />
        <text x="400" y="110" font-weight="bold" font-size="16" fill="#333">T</text>
        <line x1="275" y1="370" x2="275" y2="390" stroke="#333" stroke-width="1" />
        <path d="M315 410 Q 420 410 450 260" fill="none" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)" />
      </svg>
    </div>
  `,
  'is_2025_q1b_farming': `
    <div class="my-4 flex flex-col md:flex-row justify-center gap-10 bg-white p-4 rounded-lg border border-gray-200">
      <div class="flex flex-col items-center">
        <h4 class="font-bold mb-4 text-lg text-slate-800">System K (Shifting Cultivation)</h4>
        <svg width="250" height="250" viewBox="0 0 250 250" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <marker id="arrowK" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#166534" />
            </marker>
          </defs>
          <rect x="20" y="20" width="80" height="60" fill="#dcfce7" stroke="#166534" />
          <text x="60" y="45" text-anchor="middle" font-weight="bold" font-size="12">Farmland A</text>
          <text x="60" y="65" text-anchor="middle" font-size="10">Year 1</text>
          <rect x="150" y="20" width="80" height="60" fill="#dcfce7" stroke="#166534" />
          <text x="190" y="45" text-anchor="middle" font-weight="bold" font-size="12">Farmland B</text>
          <text x="190" y="65" text-anchor="middle" font-size="10">Year 4</text>
          <rect x="150" y="150" width="80" height="60" fill="#dcfce7" stroke="#166534" />
          <text x="190" y="175" text-anchor="middle" font-weight="bold" font-size="12">Farmland C</text>
          <text x="190" y="195" text-anchor="middle" font-size="10">Year 7</text>
          <rect x="20" y="150" width="80" height="60" fill="#dcfce7" stroke="#166534" />
          <text x="60" y="175" text-anchor="middle" font-weight="bold" font-size="12">Farmland D</text>
          <text x="60" y="195" text-anchor="middle" font-size="10">Year 10</text>
          <path d="M100 50 L140 50" stroke="#166534" stroke-width="2" marker-end="url(#arrowK)" />
          <path d="M190 80 L190 140" stroke="#166534" stroke-width="2" marker-end="url(#arrowK)" />
          <path d="M150 180 L110 180" stroke="#166534" stroke-width="2" marker-end="url(#arrowK)" />
          <path d="M60 150 L60 90" stroke="#166534" stroke-width="2" marker-end="url(#arrowK)" />
        </svg>
      </div>
      <div class="flex flex-col items-center">
        <h4 class="font-bold mb-4 text-lg text-slate-800">System L (Crop Rotation)</h4>
        <svg width="250" height="250" viewBox="0 0 250 250" xmlns="http://www.w3.org/2000/svg">
           <defs>
            <marker id="arrowL" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#d97706" />
            </marker>
          </defs>
           <rect x="25" y="25" width="200" height="200" fill="none" stroke="#333" stroke-width="3" />
           <line x1="125" y1="25" x2="125" y2="225" stroke="#333" stroke-width="2" />
           <line x1="25" y1="125" x2="225" y2="125" stroke="#333" stroke-width="2" />
           <text x="75" y="75" text-anchor="middle" font-weight="bold" font-size="14">Plot 1</text>
           <text x="175" y="75" text-anchor="middle" font-weight="bold" font-size="14">Plot 2</text>
           <text x="175" y="175" text-anchor="middle" font-weight="bold" font-size="14">Plot 3</text>
           <text x="75" y="175" text-anchor="middle" font-weight="bold" font-size="14">Plot 4</text>
           <path d="M90 60 Q 125 40 160 60" fill="none" stroke="#d97706" stroke-width="3" marker-end="url(#arrowL)" />
           <path d="M190 90 Q 210 125 190 160" fill="none" stroke="#d97706" stroke-width="3" marker-end="url(#arrowL)" />
           <path d="M160 190 Q 125 210 90 190" fill="none" stroke="#d97706" stroke-width="3" marker-end="url(#arrowL)" />
           <path d="M60 160 Q 40 125 60 90" fill="none" stroke="#d97706" stroke-width="3" marker-end="url(#arrowL)" />
        </svg>
      </div>
    </div>
  `,
  'is_2025_q1c_inclined_plane': `
    <div class="my-4 flex justify-center bg-white p-4 rounded-lg border border-gray-200">
      <svg width="500" height="300" viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <marker id="arrowheadF" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#000" />
            </marker>
        </defs>
        <line x1="40" y1="280" x2="460" y2="280" stroke="#000" stroke-width="2" />
        <text x="250" y="295" text-anchor="middle" font-weight="bold">Figure 1(c)</text>
        <path d="M40 280 L400 120 L400 280 Z" fill="#f3f4f6" stroke="#000" stroke-width="2" />
        <g transform="translate(220, 200) rotate(-24)">
            <rect x="-30" y="-20" width="60" height="40" fill="#d1d5db" stroke="#000" stroke-width="1.5" />
            <text x="0" y="5" text-anchor="middle" font-weight="bold">W2</text>
        </g>
        <line x1="250" y1="185" x2="360" y2="135" stroke="#000" stroke-width="1.5" />
        <line x1="280" y1="172" x2="320" y2="154" stroke="#000" stroke-width="2" marker-end="url(#arrowheadF)" />
        <text x="300" y="150" font-weight="bold" font-size="16">I</text>
        <line x1="220" y1="200" x2="220" y2="260" stroke="#000" stroke-width="2" marker-end="url(#arrowheadF)" />
        <text x="230" y="250" font-weight="bold" font-size="16">II</text>
        <line x1="220" y1="200" x2="200" y2="160" stroke="#000" stroke-width="2" marker-end="url(#arrowheadF)" />
        <text x="190" y="170" font-weight="bold" font-size="16">III</text>
        <circle cx="370" cy="120" r="10" fill="none" stroke="black" stroke-width="1.5" />
        <line x1="370" y1="130" x2="370" y2="160" stroke="black" stroke-width="1.5" />
        <line x1="370" y1="140" x2="360" y2="135" stroke="black" stroke-width="1.5" />
        <line x1="370" y1="160" x2="360" y2="180" stroke="black" stroke-width="1.5" />
        <line x1="370" y1="160" x2="380" y2="180" stroke="black" stroke-width="1.5" />
      </svg>
    </div>
  `,
  'is_2025_q1d_experiments': `
    <div class="my-4 flex flex-col md:flex-row justify-center items-end gap-10 bg-white p-4 rounded-lg border border-gray-200">
      <div class="flex flex-col items-center">
        <h4 class="font-bold mb-2 text-lg">A</h4>
        <svg width="350" height="300" viewBox="0 0 350 300" xmlns="http://www.w3.org/2000/svg">
           <defs>
             <marker id="arrow" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto">
               <path d="M0,0 L0,6 L6,3 z" fill="#000" />
             </marker>
           </defs>
           <path d="M50 270 Q 60 220 70 270" fill="#f97316" stroke="#ef4444" />
           <rect x="40" y="270" width="40" height="10" fill="#333" />
           <circle cx="60" cy="190" r="40" fill="none" stroke="black" stroke-width="2" />
           <rect x="50" y="130" width="20" height="40" fill="none" stroke="black" stroke-width="2" />
           <path d="M25 200 Q 60 210 95 200 A 40 40 0 0 0 25 200" fill="#bae6fd" opacity="0.5" />
           <text x="30" y="180" font-weight="bold">IV</text>
           <path d="M60 130 L60 110 L130 130" fill="none" stroke="black" stroke-width="2" />
           <text x="90" y="115" font-weight="bold">V</text>
           <g transform="translate(130, 130) rotate(20)">
             <rect x="0" y="-15" width="120" height="30" fill="#f1f5f9" stroke="black" stroke-width="2" />
             <line x1="0" y1="0" x2="120" y2="0" stroke="black" stroke-width="2" stroke-dasharray="4" />
             <line x1="100" y="-15" x2="100" y2="-25" stroke="black" stroke-width="2" />
             <text x="100" y="-30" font-size="10" text-anchor="middle">Water out</text>
             <line x1="20" y1="15" x2="20" y2="25" stroke="black" stroke-width="2" />
             <text x="20" y="35" font-size="10" text-anchor="middle">Water in</text>
           </g>
           <text x="180" y="120" font-weight="bold">II</text>
           <path d="M242 172 L250 180" fill="none" stroke="black" stroke-width="2" />
           <path d="M240 270 L280 270 L270 200 L250 200 Z" fill="none" stroke="black" stroke-width="2" />
           <text x="290" y="240" font-weight="bold">III</text>
           <circle cx="260" cy="210" r="2" fill="#3b82f6" />
           <circle cx="260" cy="220" r="2" fill="#3b82f6" />
           <text x="300" y="210" font-size="10">Distillate</text>
        </svg>
      </div>
      <div class="flex flex-col items-center">
        <h4 class="font-bold mb-2 text-lg">B</h4>
        <svg width="200" height="300" viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
           <path d="M40 50 Q 120 50 120 150 V 220" fill="none" stroke="#64748b" stroke-width="12" stroke-linecap="round" />
           <path d="M40 50 Q 120 50 120 150 V 220" fill="none" stroke="#94a3b8" stroke-width="6" stroke-linecap="round" />
           <text x="80" y="40" font-weight="bold">VI</text>
           <rect x="60" y="220" width="120" height="60" fill="#fca5a5" stroke="black" />
           <circle cx="80" cy="240" r="2" fill="#7f1d1d" />
           <circle cx="100" cy="250" r="2" fill="#7f1d1d" />
           <circle cx="130" cy="245" r="2" fill="#7f1d1d" />
           <circle cx="90" cy="270" r="2" fill="#7f1d1d" />
           <text x="190" y="240" font-weight="bold">VII</text>
           <path d="M120 220 L120 250" stroke="#3b82f6" stroke-width="2" stroke-dasharray="2" />
           <text x="150" y="270" font-size="10" fill="#3b82f6">Water</text>
        </svg>
      </div>
    </div>
  `,
  'computing_q1a_flowchart_answer': `<div class="my-4 flex justify-center bg-white p-2 rounded-lg">
     <img src="https://storage.googleapis.com/aistudio-hub-generative-ai-app-builder-public/user-assets/2024-07-22/19:48:30.939Z/image-4.jpeg" alt="Flowchart Answer" class="max-w-sm h-auto rounded-lg">
  </div>`,
   'computing_2025_q2c_table': `<div class="my-4 flex justify-center bg-white p-2 rounded-lg">
    <table class="border-collapse border border-gray-400 text-sm w-full max-w-md">
        <thead>
            <tr class="bg-gray-200">
                <th class="border border-gray-400 p-2"></th>
                <th class="border border-gray-400 p-2">A</th>
                <th class="border border-gray-400 p-2">B</th>
                <th class="border border-gray-400 p-2">C</th>
                <th class="border border-gray-400 p-2">D</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="border border-gray-400 p-2 font-bold bg-gray-100">1</td>
                <td class="border border-gray-400 p-2 font-bold">Days</td>
                <td class="border border-gray-400 p-2 font-bold">Items</td>
                <td class="border border-gray-400 p-2 font-bold">Quantity</td>
                <td class="border border-gray-400 p-2 font-bold">Amount GH¢</td>
            </tr>
            <tr>
                <td class="border border-gray-400 p-2 font-bold bg-gray-100">2</td>
                <td class="border border-gray-400 p-2">Monday</td>
                <td class="border border-gray-400 p-2">Exercise books</td>
                <td class="border border-gray-400 p-2">4</td>
                <td class="border border-gray-400 p-2">60.00</td>
            </tr>
            <tr>
                <td class="border border-gray-400 p-2 font-bold bg-gray-100">3</td>
                <td class="border border-gray-400 p-2">Tuesday</td>
                <td class="border border-gray-400 p-2">Pens</td>
                <td class="border border-gray-400 p-2">6</td>
                <td class="border border-gray-400 p-2">40.00</td>
            </tr>
            <tr>
                <td class="border border-gray-400 p-2 font-bold bg-gray-100">4</td>
                <td class="border border-gray-400 p-2 font-bold">Total</td>
                <td class="border border-gray-400 p-2"></td>
                <td class="border border-gray-400 p-2"></td>
                <td class="border border-gray-400 p-2"></td>
            </tr>
        </tbody>
    </table>
  </div>`,
  'math_2025_q5a_pie': `
    <div class="my-4 flex justify-center bg-white p-4 rounded-lg border border-gray-200">
        <svg width="300" height="300" viewBox="0 0 300 300">
            <path d="M150,150 L150,0 A150,150 0 0,1 292.6,196.4 Z" fill="#e0f2fe" stroke="black" stroke-width="1"/>
            <text x="200" y="80" font-size="12" font-weight="bold">Rice</text>
            <text x="200" y="100" font-size="12">108°</text>
            <path d="M150,150 L292.6,196.4 A150,150 0 0,1 238.2,272.7 Z" fill="#fef3c7" stroke="black" stroke-width="1"/>
            <text x="240" y="210" font-size="12" font-weight="bold">Sugar</text>
            <text x="250" y="230" font-size="12">36°</text>
            <path d="M150,150 L238.2,272.7 A150,150 0 0,1 61.8,272.7 Z" fill="#dcfce7" stroke="black" stroke-width="1"/>
            <text x="140" y="250" font-size="12" font-weight="bold">Fish</text>
            <path d="M150,150 L61.8,272.7 A150,150 0 0,1 28.6,61.8 Z" fill="#fee2e2" stroke="black" stroke-width="1"/>
            <text x="60" y="180" font-size="12" font-weight="bold">Gari</text>
            <rect x="135" y="150" width="15" height="15" fill="none" stroke="black" transform="rotate(-36 150 150)"/>
            <path d="M150,150 L28.6,61.8 A150,150 0 0,1 150,0 Z" fill="#f3f4f6" stroke="black" stroke-width="1"/>
            <text x="90" y="60" font-size="12" font-weight="bold">Flour</text>
            <text x="110" y="80" font-size="12">54°</text>
        </svg>
    </div>
  `,
  'math_2025_q6_graph': `
    <div class="my-4 flex justify-center bg-white p-4 rounded-lg border border-gray-200">
        <svg width="400" height="300" viewBox="-40 -20 400 320">
            <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" stroke-width="1"/>
                </pattern>
            </defs>
            <rect width="320" height="280" fill="url(#grid)" />
            <line x1="0" y1="280" x2="320" y2="280" stroke="black" stroke-width="2"/>
            <line x1="0" y1="0" x2="0" y2="280" stroke="black" stroke-width="2"/>
            <text x="160" y="310" text-anchor="middle" font-size="12">Time (in minutes)</text>
            <text x="-15" y="140" text-anchor="middle" font-size="12" transform="rotate(-90 -15 140)">Distance (in km)</text>
            <text x="0" y="295" font-size="10">0</text>
            <text x="40" y="295" font-size="10">20</text>
            <text x="80" y="295" font-size="10">40</text>
            <text x="120" y="295" font-size="10">60</text>
            <text x="160" y="295" font-size="10">80</text>
            <text x="200" y="295" font-size="10">100</text>
            <text x="240" y="295" font-size="10">120</text>
            <text x="280" y="295" font-size="10">140</text>
            <text x="320" y="295" font-size="10">160</text>
            <text x="-10" y="280" font-size="10">0</text>
            <text x="-10" y="240" font-size="10">5</text>
            <text x="-10" y="200" font-size="10">10</text>
            <text x="-10" y="160" font-size="10">15</text>
            <text x="-10" y="120" font-size="10">20</text>
            <text x="-10" y="80" font-size="10">25</text>
            <text x="-10" y="40" font-size="10">30</text>
            <text x="-10" y="0" font-size="10">35</text>
            <circle cx="0" cy="280" r="3" fill="black" />
            <text x="5" y="275" font-size="10" font-weight="bold">Kadumgu</text>
            <circle cx="120" cy="200" r="3" fill="black" />
            <text x="110" y="190" font-size="10" font-weight="bold">Cooltown</text>
            <line x1="0" y1="280" x2="120" y2="200" stroke="black" stroke-width="2" />
            <line x1="120" y1="200" x2="180" y2="200" stroke="black" stroke-width="2" />
            <circle cx="300" cy="-40" r="3" fill="black" />
            <line x1="180" y1="200" x2="300" y2="-40" stroke="black" stroke-width="2" />
            <text x="280" y="20" font-size="10" font-weight="bold">Datanu</text>
        </svg>
    </div>
  `,
  'ct_money_box': `<div class="my-4 flex justify-center"><img src="https://storage.googleapis.com/aistudio-hub-generative-ai-app-builder-public/user-assets/2024-07-23/02:12:44.254Z/image-0.jpeg" alt="Figure 1: Money Box" class="max-w-full h-auto rounded-lg bg-white p-2" style="max-height: 400px; clip-path: inset(25% 0 35% 0); -webkit-clip-path: inset(25% 0 35% 0);"></div>`,
  'ct_l_shape': `<div class="my-4 flex justify-center"><img src="https://storage.googleapis.com/aistudio-hub-generative-ai-app-builder-public/user-assets/2024-07-23/02:12:44.254Z/image-1.jpeg" alt="Figure 2: L-shaped wooden block" class="max-w-full h-auto rounded-lg bg-white p-2" style="max-height: 300px; clip-path: inset(55% 0 10% 0); -webkit-clip-path: inset(55% 0 10% 0);"></div>`,
  'french_2025_whatsapp': `<div class="my-4 flex justify-center">
    <div class="w-full max-w-sm rounded-2xl bg-gray-200 p-2 border-4 border-gray-800">
      <div class="bg-white rounded-xl overflow-hidden shadow-lg">
        <div class="bg-gray-100 p-3 flex items-center justify-between border-b">
          <div class="flex items-center">
            <span class="text-gray-700 font-bold text-lg">&larr;</span>
            <div class="w-8 h-8 rounded-full bg-gray-300 ml-3 flex items-center justify-center text-gray-500 font-bold">J</div>
            <span class="ml-3 font-bold text-gray-800">Janice</span>
          </div>
          <div class="flex items-center text-gray-600 gap-4 text-xl">
            <span>&#128249;</span>
            <span>&#9742;</span>
            <span>&#8942;</span>
          </div>
        </div>
        <div class="p-4 bg-gray-50 min-h-[200px]" style="background-image: url('https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-doodle-pattern-patterns.jpg'); background-size: cover; background-position: center;">
          <div class="bg-green-100 p-2 rounded-lg max-w-[85%] shadow-sm" style="box-shadow: 0 1px 1px rgba(0,0,0,0.1);">
            <p class="text-gray-800 text-sm">Salut !</p>
            <p class="text-gray-800 text-sm mt-1">J'espère que tu passes de bonnes vacances. Moi, je suis à Cape Coast chez mon oncle et je prépare mon anniversaire. C'est le 15 juillet à l'hôtel Savoy à 15 heures. Je t'invite.</p>
            <p class="text-gray-800 text-sm mt-1">A bientôt !</p>
          </div>
          <div class="mt-4 border-t border-gray-200 pt-2 absolute bottom-2 left-2 right-2 px-2">
              <div class="w-full bg-white border border-gray-300 rounded-full p-2 min-h-[40px] shadow-sm"></div>
          </div>
        </div>
      </div>
    </div>
  </div>`,
};

interface Question {
  number: string;
  text: string;
  diagramId?: string;
  marks?: number;
  sub_questions?: {
    number?: string;
    text: string;
    diagramId?: string;
    answer: string;
    sub_parts?: {
        number: string;
        text: string;
        answer: string;
    }[];
  }[];
  options?: { key: string; text: string }[];
  answer?: string;
}

interface Section {
  title: string;
  instructions: string;
  marks: number;
  questions: Question[];
}

export interface PastQuestionPaper {
  year: number;
  subject: string;
  sections: Section[];
}

export const beceQuestions: PastQuestionPaper[] = [
  {
    year: 2025,
    subject: 'Integrated Science',
    sections: [
        {
            title: 'PAPER 1 - OBJECTIVE TEST',
            instructions: 'Answer all questions.',
            marks: 40,
            questions: [
                { number: '1', text: 'Which of the following is a semi-metal?', options: [{key:'A', text:'Carbon'}, {key:'B', text:'Silicon'}, {key:'C', text:'Sodium'}, {key:'D', text:'Sulphur'}], answer: 'B' },
                { number: '2', text: 'The main difference between plants and animals is that plants', options: [{key:'A', text:'are sensitive'}, {key:'B', text:'make their own food'}, {key:'C', text:'respire'}, {key:'D', text:'grow'}], answer: 'B' },
            ]
        },
        {
            title: 'PAPER 2 - ESSAY',
            instructions: 'Answer Question 1 and any other three questions.',
            marks: 60,
            questions: [
                {
                    number: '1',
                    text: '(a) The diagram below (Figure 1) is an illustration of the carbon cycle.<br>Study it carefully and answer the questions that follow.',
                    diagramId: 'is_2025_q1a_cycle',
                    sub_questions: [
                        { number: '(i)', text: 'Identify the processes labeled A, B, C, and D.', answer: 'A: Photosynthesis<br>B: Respiration<br>C: Decomposition / Decay<br>D: Combustion / Burning' },
                        { number: '(ii)', text: 'Name the gas used in process A.', answer: 'Carbon dioxide (CO₂)' },
                        { number: '(iii)', text: 'State two human activities that increase the amount of the gas labeled P in the atmosphere.', answer: '1. Burning of fossil fuels (coal, oil, gas).<br>2. Deforestation (cutting down trees).' }
                    ]
                },
                {
                    number: '1(b)',
                    text: 'The diagrams below (Figure 1b) show two farming systems, K and L.<br>Study them carefully and answer the questions.',
                    diagramId: 'is_2025_q1b_farming',
                    sub_questions: [
                        { number: '(i)', text: 'Identify the farming systems K and L.', answer: 'K: Shifting Cultivation (Land Rotation)<br>L: Crop Rotation' },
                        { number: '(ii)', text: 'State two advantages of system L over system K.', answer: '1. It maintains soil fertility for a longer period.<br>2. It allows for the efficient use of land (no need to clear new forests).<br>3. It helps control pests and diseases.' }
                    ]
                },
                {
                    number: '1(c)',
                    text: 'Figure 1(c) is an illustration of an inclined plane used to lift a load.<br>Study it and answer the questions.',
                    diagramId: 'is_2025_q1c_inclined_plane',
                    sub_questions: [
                        { number: '(i)', text: 'Name the parts labeled I, II, and III.', answer: 'I: Effort distance / Length of plane<br>II: Load distance / Height of plane<br>III: Angle of inclination' },
                        { number: '(ii)', text: 'State the relationship between the mechanical advantage and the velocity ratio if the efficiency is 100%.', answer: 'Mechanical Advantage (MA) = Velocity Ratio (VR).' }
                    ]
                },
                {
                    number: '1(d)',
                    text: 'The diagrams A and B (Figure 1d) show experimental setups used in the laboratory.<br>Study them and answer the questions.',
                    diagramId: 'is_2025_q1d_experiments',
                    sub_questions: [
                        { number: '(i)', text: 'Identify the setups A and B.', answer: 'A: Distillation apparatus (Liebig condenser)<br>B: Filtration apparatus' },
                        { number: '(ii)', text: 'What is the function of the part labeled II?', answer: 'It cools and condenses the vapor back into liquid.' },
                        { number: '(iii)', text: 'Name the separation method shown in B.', answer: 'Filtration' }
                    ]
                }
            ]
        }
    ]
  },
  {
    year: 2025,
    subject: 'Computing',
    sections: [
        {
            title: 'PAPER 1 - OBJECTIVE TEST',
            instructions: 'Answer all questions.',
            marks: 40,
            questions: [
                { number: '1', text: 'A programmer has indented the codes in the program being written. The purpose of the indentation is to', options: [{key:'A', text:'make the code difficult to read by users'}, {key:'B', text:'hide the code from others when writing it'}, {key:'C', text:'create bugs in the program to disturb the codes'}, {key:'D', text:'show the start and end of a conditional statement'}], answer: 'D' },
                { number: '2', text: 'At the Internet cafe, Kofi connected his laptop to the Internet without using cable and Akua also connected her laptop to the Internet using cable. An example of Akua\'s connection type is', options: [{key:'A', text:'Infrared'}, {key:'B', text:'Bluetooth'}, {key:'C', text:'Wi-Fi adaptor'}, {key:'D', text:'Ethernet adaptor'}], answer: 'D' },
                { number: '3', text: 'In a group presentation, a group was to demonstrate how to insert an online video into a slide they have created. The first step to be considered by the group is to click on the', options: [{key:'A', text:'Insert tab'}, {key:'B', text:'Design tab'}, {key:'C', text:'Online video'}, {key:'D', text:'Download video'}], answer: 'A' },
                { number: '4', text: 'A man shared his property to his children and wife in a particular ratio. The most appropriate chart type that can be used to represent the sharing of the property is', options: [{key:'A', text:'pie chart'}, {key:'B', text:'bar chart'}, {key:'C', text:'line chart'}, {key:'D', text:'scatter chart'}], answer: 'A' },
                { number: '5', text: 'Robotic systems have components that relates to the functioning of the human organs. The component of the robot that acts like the human brain is the', options: [{key:'A', text:'motors'}, {key:'B', text:'sensors'}, {key:'C', text:'batteries'}, {key:'D', text:'controllers'}], answer: 'D' },
                { number: '6', text: 'A programmer uses a good algorithm to write a software. The algorithm being used is characterized by the following except', options: [{key:'A', text:'efficiency'}, {key:'B', text:'simplicity'}, {key:'C', text:'correctness'}, {key:'D', text:'complexity'}], answer: 'D' },
                { number: '7', text: 'Miss Fatima, the computing teacher taught the class basic programming terms. Explain to your friend what Miss Fatima said pseudocode is', options: [{key:'A', text:'compiled programming codes'}, {key:'B', text:'structured programming symbols'}, {key:'C', text:'flowchart decisions using symbols'}, {key:'D', text:'step-by-step outline of a program using informal language'}], answer: 'D' },
                { number: '8', text: 'The computing teacher during computing class advised the students that, studying computer networking provides entrepreneurial opportunities. Which of the following statements in your opinion justifies the advise given to the students?', options: [{key:'A', text:'Offering consulting services'}, {key:'B', text:'Developing video games online'}, {key:'C', text:'Creating social media platforms'}, {key:'D', text:'Designing smartphone Apps for schools'}], answer: 'A' },
                { number: '9', text: 'In a computing class, a video of a user who gained unauthorized access into an organization\'s computer system was shown and discussed. The user\'s act in the video is termed', options: [{key:'A', text:'hacking'}, {key:'B', text:'encryption'}, {key:'C', text:'cyberbully'}, {key:'D', text:'authentication'}], answer: 'A' },
                { number: '10', text: 'To make teaching and learning of computing more interactive, the teacher intends to demonstrate an activity by showing diagrams, images and videos on a large screen in the classroom. The most appropriate device to achieve this objective by the teacher is a', options: [{key:'A', text:'printer'}, {key:'B', text:'plotter'}, {key:'C', text:'monitor'}, {key:'D', text:'projector'}], answer: 'D' },
                { number: '11', text: 'The graphic tablet is a kind of device used to capture', options: [{key:'A', text:'RFID signals'}, {key:'B', text:'QR code scans'}, {key:'C', text:'magnetic card data'}, {key:'D', text:'handwritings, drawings and inputs'}], answer: 'D' },
                { number: '12', text: 'After replacing his old smartphone with a new one, Muba cannot access most of his saved contacts. His friend advised that, he should have saved the contacts in an e-mail environment. The feature that would have allowed Muba to save and organize the contacts in the e-mail environment is referred to as', options: [{key:'A', text:'draft'}, {key:'B', text:'folders'}, {key:'C', text:'attach files'}, {key:'D', text:'address book'}], answer: 'D' },
                { number: '13', text: 'Text formatting options in Word processing applications include', options: [{key:'A', text:'subscript'}, {key:'B', text:'underline'}, {key:'C', text:'superscript'}, {key:'D', text:'strikethrough'}], answer: 'ALL' },
                { number: '14', text: 'A school prefect approached the computing club to guide him design a presentation using Microsoft PowerPoint. The prefect intends to practice the presentation and record the time spent for each slide to make his presentation run smooth. The best feature the computing club will suggest to the prefect is', options: [{key:'A', text:'presenter notes'}, {key:'B', text:'presenter feature'}, {key:'C', text:'rehearse feature'}, {key:'D', text:'rehearse timings'}], answer: 'D' },
                { number: '15', text: 'Which of the following terminologies is associated with computer network?', options: [{key:'A', text:'Junk'}, {key:'B', text:'Trojan'}, {key:'C', text:'Firewall'}, {key:'D', text:'Defragmenter'}], answer: 'C' },
                { number: '16', text: 'What value will the Microsoft Excel function =COUNT(A1:A10) return?', options: [{key:'A', text:'1'}, {key:'B', text:'9'}, {key:'C', text:'10'}, {key:'D', text:'11'}], answer: 'C' },
                { number: '17', text: 'The term multimedia is widely used in several areas in the computing environment. What will you tell the computing teacher about the function of a multimedia feature in Word processing application?', options: [{key:'A', text:'It converts texts into audio formats'}, {key:'B', text:'It translates texts into different languages'}, {key:'C', text:'It removes images from word document'}, {key:'D', text:'It adds interactive elements like buttons and links'}], answer: 'D' },
                { number: '18', text: 'In a Desktop Publishing project work, a student\'s work contained more text than it can display. This situation is best described as', options: [{key:'A', text:'layout'}, {key:'B', text:'template'}, {key:'C', text:'overflow'}, {key:'D', text:'alignment'}], answer: 'C' },
                { number: '19', text: 'A designer consistently reminds his staff to use template in Desktop publishing because it helps to', options: [{key:'A', text:'create documents in unique ways'}, {key:'B', text:'provide a starting point for document design'}, {key:'C', text:'decorate the document for distribution to others'}, {key:'D', text:'provide an opportunity for users to print their work'}], answer: 'B' },
                { number: '20', text: 'A quiz master asked participants to complete the statement: while download folder is the default location for downloaded files, my recent folder is the default location for documents', options: [{key:'A', text:'just printed'}, {key:'B', text:'to be saved'}, {key:'C', text:'just worked on'}, {key:'D', text:'to be worked on'}], answer: 'C' },
                { number: '21', text: 'The role of neural networks in Artificial Intelligence in modern technology is to', options: [{key:'A', text:'control robots within their environment for work and safety'}, {key:'B', text:'enhance Internet speed for fast movements of the robots'}, {key:'C', text:'create computer virus for robots to find solutions to them'}, {key:'D', text:'simulate human brain function for learning and problem-solving'}], answer: 'D' },
                { number: '22', text: 'Robots are used in many areas of the society. An example of the application of robots in the society includes', options: [{key:'A', text:'virtual reality'}, {key:'B', text:'machine learning'}, {key:'C', text:'artificial intelligence'}, {key:'D', text:'autonomous vehicles'}], answer: 'D' },
                { number: '23', text: 'The Secretary to the Parliament of Ghana sits on an ergonomic chair to work in the office because it', options: [{key:'A', text:'ensures proper sitting arrangements'}, {key:'B', text:'makes the workplace looks attractive'}, {key:'C', text:'aligns the chairs properly with the workstation'}, {key:'D', text:'promotes proper body alignment and support'}], answer: 'D' },
                { number: '24', text: 'An entry on a blog that contains texts, images or multimedia content is called', options: [{key:'A', text:'post'}, {key:'B', text:'name'}, {key:'C', text:'status'}, {key:'D', text:'account'}], answer: 'A' },
                { number: '25', text: 'A student is very good at converting any integer to binary but finds it difficult to convert from hexadecimal to binary. Help the student to convert the hexadecimal number A2₁₆ to binary.', options: [{key:'A', text:'10000110₂'}, {key:'B', text:'10100010₂'}, {key:'C', text:'10010001₂'}, {key:'D', text:'10001010₂'}], answer: 'B' },
                { number: '26', text: 'A customer gave a new laptop to a technician to set accounts on windows that is required to make changes to all system settings. The best account type that you will advise the technician to consider is', options: [{key:'A', text:'Guest'}, {key:'B', text:'Remote'}, {key:'C', text:'Standard'}, {key:'D', text:'Administrator'}], answer: 'D' },
                { number: '27', text: 'A user intends to create and customize diagrams in Microsoft PowerPoint application for a presentation. The best feature to help the user achieve the task is', options: [{key:'A', text:'Charts'}, {key:'B', text:'Shapes'}, {key:'C', text:'WordArt'}, {key:'D', text:'SmartArt'}], answer: 'D' },
                { number: '28', text: 'Surfing the Internet requires the use of search engines which was designed to help users find', options: [{key:'A', text:'information on the Internet'}, {key:'B', text:'information from e-mail messages'}, {key:'C', text:'information from the computer hard disk drive'}, {key:'D', text:'information from files and folders on the computer'}], answer: 'A' },
                { number: '29', text: 'The purpose of the IF function in Microsoft Excel application is to', options: [{key:'A', text:'calculate the average of a range of cells'}, {key:'B', text:'manipulate text from multiple cells into one cell'}, {key:'C', text:'perform a logical test and return a value for a condition'}, {key:'D', text:'return the value from a specified row and column intersection'}], answer: 'C' },
                { number: '30', text: 'Zalia is very good at posting her pictures and location of where ever she goes on her social media platforms for her friends to see. The potential risk associated with Zalia\'s activities online is', options: [{key:'A', text:'identity theft'}, {key:'B', text:'learning difficulties'}, {key:'C', text:'strengthening friendships'}, {key:'D', text:'building a professional network'}], answer: 'A' },
                { number: '31', text: 'Computers have become smaller, faster, and more reliable due to the use of microprocessor in the', options: [{key:'A', text:'second generation'}, {key:'B', text:'third generation'}, {key:'C', text:'fourth generation'}, {key:'D', text:'fifth generation'}], answer: 'C' },
                { number: '32', text: 'Bello formatted Microsoft Excel worksheet cells with different colours based on specific conditions and it was very beautiful. Which of the given features can a student use to achieve the same results as Bello?', options: [{key:'A', text:'Conditional sorting'}, {key:'B', text:'Conditional filtering'}, {key:'C', text:'Conditional validation'}, {key:'D', text:'Conditional formatting'}], answer: 'D' },
                { number: '33', text: 'After the computing class, a colleague approached you to further explain to him how to reference a worksheet cell in Microsoft Excel. In the explanation, you mentioned that, to reference a cell, one need to use the cell', options: [{key:'A', text:'value'}, {key:'B', text:'address'}, {key:'C', text:'content'}, {key:'D', text:'function'}], answer: 'B' },
                { number: '34', text: 'In the concept of programming, a comment in a program code is used to', options: [{key:'A', text:'explain portions of the code'}, {key:'B', text:'make the program run faster'}, {key:'C', text:'change the output of the program'}, {key:'D', text:'temporarily remove a line of code'}], answer: 'A' },
                { number: '35', text: 'A weekend assignment requires students to create a blog for the school. The best activity needed for the assignment is to', options: [{key:'A', text:'pick the blog name and niche'}, {key:'B', text:'display advertisement of the blog'}, {key:'C', text:'provide consulting services to the bloggers'}, {key:'D', text:'determine the product to sell on the blog'}], answer: 'A' },
                { number: '36', text: 'The most powerful technological innovation made during the development of the fifth-generation computers was the use of', options: [{key:'A', text:'vacuum tubes'}, {key:'B', text:'integrated circuits'}, {key:'C', text:'VLSI microprocessors'}, {key:'D', text:'ULSI microprocessors'}], answer: 'D' },
            ]
        },
        {
            title: 'PAPER 2 - ESSAY',
            instructions: 'Answer all questions in Section A and any other three questions in Section B.',
            marks: 60,
            questions: [
                {
                    number: '1',
                    text: 'As a computing student, you are to program a robot to assist your colleagues to buy stationery from a shop. The sequence of activities undertaken to buy the stationery at the shop is as follows:<br>Go to the stationery shop;<br>Select the needed stationery;<br>Check the price of the selected stationery;<br>Go to the cash counter;<br>Pay money to the cashier;<br>Take the stationery along;<br>Leave the shop.<br>(a) Draw a flowchart using the sequence of activities.',
                    diagramId: 'computing_q1a_flowchart_answer',
                    answer: '<strong>Marking Scheme:</strong><br>The flowchart should start with an oval "Start".<br>Arrows should connect the steps downward.<br>Rectangles should be used for processing steps (Go to shop, Select stationery, Check price, Go to counter, Pay money, Take stationery, Leave shop).<br>The flowchart should end with an oval "Stop" or "End".<br>Correct sequence logic is required.'
                },
                {
                    number: '1(b)',
                    text: 'Suggest three modes of payment the students could use to pay the cashier.',
                    answer: '1. Cash<br>2. Mobile Money (MoMo)<br>3. Debit/Credit Card (POS)'
                },
                {
                    number: '1(c)',
                    text: 'Describe one of the modes of payment suggested in 1(b).',
                    answer: '<strong>Mobile Money:</strong> This is a digital payment method performed from a mobile device. The user dials a USSD code or uses an app, enters the merchant number and amount, and confirms with a PIN to transfer funds electronically to the cashier.'
                },
                {
                    number: '1(d)',
                    text: 'Assume that there are four cashiers at the shop, and each of them uses a computer which is networked for their work. Draw a well labelled diagram to illustrate two network topologies that could be used to network the computers.',
                    answer: '<strong>(i) Star Topology:</strong> Drawing should show a central device (Switch/Hub) with 4 computers connected individually to it.<br><strong>(ii) Bus Topology:</strong> Drawing should show a single central cable (backbone) with 4 computers connected to it along the line, with terminators at both ends.'
                },
                {
                    number: '2(a)',
                    text: 'Explain the concept of perceptual computing to colleagues in the computing club.',
                    answer: 'Perceptual computing is a technology that allows users to interact with computers using natural human gestures, voice commands, facial expressions, and touch, rather than just traditional inputs like a keyboard and mouse. It aims to make human-computer interaction more intuitive and lifelike.'
                },
                {
                    number: '2(b)',
                    text: 'Most companies use data entry devices that capture machine-readable data directly into the computer system without using the keyboard.<br>List three of such data entry devices.',
                    answer: '1. Barcode Reader<br>2. Optical Character Reader (OCR)<br>3. Magnetic Ink Character Reader (MICR)<br>4. QR Code Scanner'
                },
                {
                    number: '2(c)',
                    text: 'Kofi, a student in your school visited the stationery shop for two days and his expenditure at the shop is as follows:<br>On Monday, he bought 4 exercise books for GHS 60.00. On Tuesday, he bought 6 pens for GHS 40.00.<br>(i) Complete the Microsoft Excel worksheet using Kofi\'s two days expenditure at the stationery shop as shown in Figure 1.',
                    diagramId: 'computing_2025_q2c_table',
                    answer: '<strong>Completed Table:</strong><br>A2: Monday, B2: Exercise books, C2: 4, D2: 60.00<br>A3: Tuesday, B3: Pens, C3: 6, D3: 40.00'
                },
                {
                    number: '2(c)(ii)',
                    text: 'Write a formula in Microsoft Excel to compute Kofi\'s total amount spent for the two days at the stationery shop.',
                    answer: '<strong>=SUM(D2:D3)</strong> or <strong>=D2+D3</strong>'
                },
                {
                    number: '3(a)',
                    text: 'Outline the steps on how to make the word Computing in Word processing document a hyperlink to the website address www.waecgh.org.',
                    answer: '1. Select/Highlight the word "Computing".<br>2. Right-click and select "Hyperlink" (or go to Insert tab > Link).<br>3. In the "Address" field of the dialog box, type "www.waecgh.org".<br>4. Click OK.'
                },
                {
                    number: '3(b)',
                    text: 'Social media sites were created for friendships, learning, entertainment and other purposes. List two of the sites used for video-sharing.',
                    answer: '1. YouTube<br>2. TikTok<br>3. Vimeo<br>4. Instagram (Reels)'
                },
                {
                    number: '3(c)',
                    text: 'A Microsoft Publisher assignment requires that texts are written over an image on a flyer. Outline the steps to accomplish the assignment.',
                    answer: '1. Insert the image onto the page.<br>2. Draw a Text Box over the image.<br>3. Type the required text inside the text box.<br>4. Format the text (color/size) to be visible over the image background.'
                },
                {
                    number: '3(d)',
                    text: 'A student complained of eye strain due to prolonged use of the computer. State two possible ways to prevent the problem.',
                    answer: '1. Take regular breaks (20-20-20 rule).<br>2. Use an anti-glare screen filter.<br>3. Adjust screen brightness to match room lighting.<br>4. Blink often to moisten eyes.'
                },
                {
                    number: '4(a)',
                    text: 'State one of the data communication models for networks.',
                    answer: 'Simplex, Half-Duplex, or Full-Duplex.'
                },
                {
                    number: '4(b)',
                    text: 'In designing a presentation, shapes allow the user to create complex objects on the slide. List two categories in which objects found under the shape tool are grouped.',
                    answer: '1. Lines<br>2. Rectangles<br>3. Basic Shapes<br>4. Block Arrows<br>5. Flowchart'
                },
                {
                    number: '4(c)',
                    text: 'Outline two of the key principles governing information security.',
                    answer: '1. <strong>Confidentiality:</strong> Ensuring information is accessible only to those authorized.<br>2. <strong>Integrity:</strong> Safeguarding the accuracy and completeness of information.<br>3. <strong>Availability:</strong> Ensuring authorized users have access when needed.'
                },
                {
                    number: '4(d)',
                    text: 'Describe how the following search techniques are used to search for information on the Internet:<br>(i) AND;<br>(ii) NOT.',
                    answer: '<strong>(i) AND:</strong> Used to narrow search results by ensuring that ALL the specified keywords appear in the results (e.g., "Cats AND Dogs").<br><strong>(ii) NOT:</strong> Used to exclude specific terms from the search results (e.g., "Jaguar NOT car" to find the animal).'
                },
                {
                    number: '5(a)',
                    text: 'Convert 10010₂ to a decimal number.',
                    answer: '1 × 2⁴ + 0 × 2³ + 0 × 2² + 1 × 2¹ + 0 × 2⁰<br>= 16 + 0 + 0 + 2 + 0<br>= <strong>18</strong>'
                },
                {
                    number: '5(b)',
                    text: 'A student is planning to compress a file on a computer so that it can be sent to a friend through e-mail. Suggest two techniques that can be used to compress the file.',
                    answer: '1. Using file compression software (e.g., WinZip, WinRAR) to create a .zip file.<br>2. Converting the file format to a more compressed version (e.g., .bmp to .jpg for images).'
                }
            ]
        }
    ]
  },
  {
    year: 2025,
    subject: 'Ghanaian Language',
    sections: [
        {
            title: 'PAPER 1 - OBJECTIVE TEST',
            instructions: 'Answer all questions.',
            marks: 40,
            questions: [
                { number: '1', text: 'Kyerɛ deɛ edidi soɔ yi ase kɔ Asante Twi mu:<br>(a) Why do people blame others for their problems?', answer: 'Adɛn nti na nipa de wɔn haw hyɛ afoforɔ?' },
                { number: '2', text: '(b) Can\'t you understand what the problem is?', answer: 'Wontumi nte asɛm no ase anaa?' },
                { number: '3', text: '(c) There are changes but we shall do our best.', answer: 'Nsesaeɛ wɔ hɔ nanso yɛbɛyɛ nea yɛbetumi.' },
                { number: '4', text: '(d) Good people gain but bad people lose.', answer: 'Nipa pa nya mfasoɔ na nipa bɔne nso hwere.' },
                { number: '5', text: '(e) I do not care.', answer: 'Ɛmfa me ho.' },
                { number: '6', text: '(f) We went prepared and won the competition.', answer: 'Yɛkɔɔ no ahosiesie mu na yɛdii nkunim wɔ akansie no mu.' },
                { number: '7', text: '(g) We must be kind to people.', answer: 'Ɛsɛ sɛ yɛyɛ nipa yie.' },
                { number: '8', text: '(h) The woman is very beautiful.', answer: 'Ɔbaa no ho yɛ fɛ papa.' },
                { number: '9', text: '(i) I am the best student.', answer: 'Mene osuani a ɔsen biara.' },
                { number: '10', text: '(j) Our teacher is hardworking.', answer: 'Yɛn kyerɛkyerɛfoɔ no yɛ adwumaden.' },
            ]
        },
        {
            title: 'PAPER 2 - THEORY',
            instructions: 'PART IV: LANGUAGE AND USAGE. Twerɛ ɔkasamu (a) - (j) no, na fa nsɛmfua a ɛdidi soɔ yi mu deɛ ɛfata hyɛ baabi a wɔagya ato hɔ no: (pɔnkɔ, asomsɛm, kɔkyerɛ, awofoɔ, denneennen, foroo).',
            marks: 10,
            questions: [
                { number: '(a)', text: 'Ɔkwakuo no ....... dua kɛseɛ no.', answer: 'foroo' },
                { number: '(b)', text: 'Agyei ...... tuu kwan nnora.', answer: 'kɔkyerɛ' },
                { number: '(c)', text: 'Me papa teaa mu ...... guu mmarimaa no so.', answer: 'denneennen' },
                { number: '(d)', text: 'Ɔhene no wɔ ....... fɛfɛ bi.', answer: 'pɔnkɔ' },
                { number: '(e)', text: 'Seesei Owura Mɛnsa ...... adeɛ wɔ yɛn sukuu mu.', answer: 'kyerɛ' },
                { number: '(f)', text: 'Opoku kaa me ........ bi faa abaayewa no ho.', answer: 'asomsɛm' },
                { number: 'PART V', text: 'Kyerɛ dwuma a ɔkasamu ahodoɔ a ɛwɔ (g) - (j) yi mu biara redi.', answer: '' },
                { number: '(g)', text: 'Deɛ ɔbɛka biara mfa me ho.', answer: 'Akyerɛ kwan (Subjunctive/Conditional)' },
                { number: '(h)', text: 'Kɔ na kɔto ɛpono no mu.', answer: 'Ɔhyɛ (Imperative)' },
                { number: '(i)', text: 'Deɛ woayɛ no seesie yi ase ne sɛn?', answer: 'Asemmisa (Interrogative)' },
                { number: '(j)', text: 'Ahodwirisɛm ni!', answer: 'Abodwokyerɛ (Exclamatory)' }
            ]
        }
    ]
  },
  {
    year: 2025,
    subject: 'Career Technology',
    sections: [
        {
            title: 'PAPER 2 - ESSAY',
            instructions: 'Answer all questions.',
            marks: 60,
            questions: [
                {
                    number: '1',
                    text: 'Figure 1 shows a wooden artifact (Money Box).<br>(a) Identify the artifact.<br>(b) State the method of construction used.<br>(c) Name two tools used in making it.',
                    diagramId: 'ct_money_box',
                    answer: '<strong>(a)</strong> Money Box / Savings Box.<br><strong>(b)</strong> Joinery (using nails/glue) or Box construction.<br><strong>(c)</strong> Hammer, Saw (Tenon saw), Measuring tape.'
                },
                {
                    number: '2',
                    text: 'Figure 2 shows an L-shaped wooden block. Draw the front elevation in the direction of arrow F.',
                    diagramId: 'ct_l_shape',
                    answer: 'The front elevation should show an "L" shape. The vertical part on the left and the horizontal base.'
                }
            ]
        }
    ]
  },
  {
    year: 2025,
    subject: 'Mathematics',
    sections: [
      {
        title: 'PAPER 1 - OBJECTIVE TEST',
        instructions: 'Answer all questions.',
        marks: 40,
        questions: [
           { number: '1', text: 'If A = {1, 2, 3, 4, 5} and B = {2, 4, 6, 8}, find A ∩ B.', options: [{key: 'A', text: '{1, 3, 5}'}, {key: 'B', text: '{2, 4}'}, {key: 'C', text: '{6, 8}'}, {key: 'D', text: '{1, 2, 3, 4, 5, 6, 8}'}], answer: 'B' },
           { number: '2', text: 'Simplify: 3/4 + 2/5.', options: [{key: 'A', text: '5/9'}, {key: 'B', text: '6/20'}, {key: 'C', text: '23/20'}, {key: 'D', text: '1/2'}], answer: 'C' },
           { number: '3', text: 'Solve for x if 3x - 5 = 10.', options: [{key: 'A', text: 'x = 3'}, {key: 'B', text: 'x = 4'}, {key: 'C', text: 'x = 5'}, {key: 'D', text: 'x = 6'}], answer: 'C' },
           { number: '4', text: 'Calculate the simple interest on GH¢500.00 for 2 years at 10% per annum.', options: [{key: 'A', text: 'GH¢50.00'}, {key: 'B', text: 'GH¢100.00'}, {key: 'C', text: 'GH¢200.00'}, {key: 'D', text: 'GH¢250.00'}], answer: 'B' },
           { number: '5', text: 'The area of a square is 64 cm². Find its perimeter.', options: [{key: 'A', text: '16 cm'}, {key: 'B', text: '24 cm'}, {key: 'C', text: '32 cm'}, {key: 'D', text: '64 cm'}], answer: 'C' }
        ]
      },
      {
        title: 'PAPER 2 - ESSAY',
        instructions: 'Answer four questions in all.',
        marks: 60,
        questions: [
           {
             number: '1',
             text: '(a) In a class of 50 students, 30 offer History and 25 offer Geography. 10 offer both subjects. Calculate the number of students who offer:<br>(i) History only;<br>(ii) Geography only.<br>(b) Solve for x in the equation: 2(x + 3) = 14.',
             answer: '<strong>(a)</strong><br>Let H = History, G = Geography.<br>n(H) = 30, n(G) = 25, n(H ∩ G) = 10.<br>(i) History only = n(H) - n(H ∩ G) = 30 - 10 = 20.<br>(ii) Geography only = n(G) - n(H ∩ G) = 25 - 10 = 15.<br><br><strong>(b)</strong><br>2(x + 3) = 14<br>2x + 6 = 14<br>2x = 14 - 6<br>2x = 8<br>x = 4'
           },
           {
             number: '2',
             text: '(a) Using a ruler and a pair of compasses only, construct a triangle ABC such that |AB| = 8cm, |AC| = 6cm and angle BAC = 60°.<br>(b) Construct the perpendicular bisector of line BC.',
             answer: '<strong>Construction Steps:</strong><br>1. Draw line AB = 8cm.<br>2. At A, construct a 60° angle.<br>3. Mark point C on the 60° line such that AC = 6cm.<br>4. Join B to C to form triangle ABC.<br>5. To bisect BC: Place compass at B, open more than half of BC, draw arcs above and below. Repeat at C with same radius. Join intersection points of arcs.'
           },
           {
             number: '3',
             text: '(a) Factorize completely: 3x² - 27.<br>(b) Make u the subject of the relation v = u + at.',
             answer: '<strong>(a) Factorization:</strong><br>3x² - 27<br>= 3(x² - 9)<br>= 3(x² - 3²)<br>= 3(x - 3)(x + 3)<br><br><strong>(b) Change of Subject:</strong><br>v = u + at<br>v - at = u<br>u = v - at'
           },
           {
             number: '4',
             text: 'A point P(2, 3) is mapped onto P\' by a translation vector T = (-1, 4).<br>(a) Find the coordinates of P\'.<br>(b) If P\' is reflected in the x-axis to P\'\', find the coordinates of P\'\'.',
             answer: '<strong>(a) Translation:</strong><br>P\' = P + T<br>P\' = (2, 3) + (-1, 4)<br>P\' = (2 + -1, 3 + 4)<br>P\' = (1, 7)<br><br><strong>(b) Reflection in x-axis:</strong><br>Rule: (x, y) → (x, -y)<br>P\'\' = (1, -7)'
           },
           {
             number: '5',
             text: 'The pie chart below shows the distribution of food items bought by a caterer for a school party. The total expenditure was GH¢1,800.00.<br>Study the chart and answer the questions.',
             diagramId: 'math_2025_q5a_pie',
             sub_questions: [
                { number: '(a)', text: 'Calculate the angle of the sector for Fish.', answer: 'The total angle in a circle is 360°.<br>Sum of known angles = 108° (Rice) + 36° (Sugar) + 90° (Gari) + 54° (Flour) = 288°.<br>Angle for Fish = 360° - 288° = <strong>72°</strong>.'},
                { number: '(b)', text: 'How much was spent on Rice?', answer: 'Amount = (Angle/360) × Total Amount<br>= (108/360) × 1800<br>= 0.3 × 1800<br>= <strong>GH¢540.00</strong>' },
                { number: '(c)', text: 'What percentage of the total amount was spent on Sugar?', answer: 'Percentage = (Angle/360) × 100%<br>= (36/360) × 100%<br>= 0.1 × 100%<br>= <strong>10%</strong>' }
             ]
           },
           {
             number: '6',
             text: 'The graph below shows the journey of a traveler from Kadumgu to Datanu via Cooltown.<br>Use the graph to answer the following questions.',
             diagramId: 'math_2025_q6_graph',
             sub_questions: [
                { number: '(a)', text: 'What is the distance between Kadumgu and Cooltown?', answer: 'From the graph, Cooltown is at distance 10km from the start (Kadumgu is at 0km).<br>Distance = 10 km.' },
                { number: '(b)', text: 'How long did the traveler rest at Cooltown?', answer: 'The horizontal part of the graph represents rest.<br>Rest started at t=60 mins and ended at t=90 mins.<br>Duration = 90 - 60 = <strong>30 minutes</strong>.' },
                { number: '(c)', text: 'Calculate the average speed for the whole journey from Kadumgu to Datanu.', answer: 'Total Distance = 40 km (Datanu is at 40km mark).<br>Total Time = 150 minutes = 2.5 hours.<br>Average Speed = Total Distance / Total Time<br>= 40 / 2.5<br>= <strong>16 km/h</strong>.' }
             ]
           }
        ]
      }
    ]
  },
  {
    year: 2025,
    subject: 'Social Studies',
    sections: [
        {
            title: 'PAPER 1 - OBJECTIVE TEST',
            instructions: 'Answer all questions.',
            marks: 40,
            questions: [
                { number: '1', text: 'The constitution of Ghana is the', options: [{key:'A', text:'highest law of the land'}, {key:'B', text:'law for the educated'}, {key:'C', text:'law made by chiefs'}, {key:'D', text:'law for the courts'}], answer: 'A' },
                { number: '2', text: 'Which of the following is a primary product of Ghana?', options: [{key:'A', text:'Canned fish'}, {key:'B', text:'Cocoa beans'}, {key:'C', text:'Furniture'}, {key:'D', text:'Textiles'}], answer: 'B' },
                { number: '3', text: 'The main reason for the formation of political parties in Ghana is to', options: [{key:'A', text:'educate the electorate'}, {key:'B', text:'ensure national unity'}, {key:'C', text:'form a government'}, {key:'D', text:'promote development'}], answer: 'C' },
            ]
        },
        {
             title: 'PAPER 2 - ESSAY',
             instructions: 'Answer three questions.',
             marks: 60,
             questions: [
                 {
                     number: '1',
                     text: '(a) Define the term <em>Environment</em>.<br>(b) Outline four ways of protecting the environment from degradation.',
                     answer: '(a) Environment refers to the total surroundings of humans, including physical features (land, water, air) and biological conditions (plants, animals) that influence life.<br>(b) 1. Afforestation/Reafforestation.<br>2. Proper waste disposal.<br>3. Public education on environmental hygiene.<br>4. Enforcement of laws against illegal mining (Galamsey).'
                 },
                 {
                     number: '2',
                     text: '(a) Explain the term <em>Adolescence</em>.<br>(b) State four challenges faced by adolescents in Ghana.',
                     answer: '(a) Adolescence is the transitional period of growth and development between childhood and adulthood, usually between the ages of 10 and 19.<br>(b) 1. Peer pressure.<br>2. Drug abuse.<br>3. Premarital sex/Teenage pregnancy.<br>4. Identity crisis/Conflict with parents.'
                 },
                 {
                     number: '3',
                     text: '(a) What is conflict management?<br>(b) Describe four ways of managing conflicts in the community.',
                     answer: '(a) Conflict management refers to the process of limiting the negative aspects of conflict while increasing the positive aspects. It involves identifying and handling conflicts in a sensible, fair, and efficient manner.<br>(b) 1. <strong>Negotiation:</strong> Parties involved discuss to reach an agreement.<br>2. <strong>Mediation:</strong> A neutral third party helps facilitate resolution.<br>3. <strong>Arbitration:</strong> A third party makes a binding decision.<br>4. <strong>Reconciliation:</strong> Restoring friendly relations after a dispute.'
                 }
             ]
        }
    ]
  },
  {
    year: 2025,
    subject: 'French',
    sections: [
        {
            title: 'PAPER 1 - OBJECTIVE TEST',
            instructions: 'Answer all questions.',
            marks: 40,
            questions: [
                { number: '1', text: 'Kofi va à l\'école _______ bus.', options: [{key:'A', text:'en'}, {key:'B', text:'dans'}, {key:'C', text:'par'}, {key:'D', text:'à'}], answer: 'A' },
                { number: '2', text: 'Maman achète des _______ au marché.', options: [{key:'A', text:'légumes'}, {key:'B', text:'légume'}, {key:'C', text:'légumeses'}, {key:'D', text:'légum'}], answer: 'A' },
                { number: '3', text: 'Mon père est _______ médecin.', options: [{key:'A', text:'un'}, {key:'B', text:'le'}, {key:'C', text:'la'}, {key:'D', text:'-' }], answer: 'D' },
                { number: '4', text: 'La robe de Marie est _______.', options: [{key:'A', text:'joli'}, {key:'B', text:'jolie'}, {key:'C', text:'jolis'}, {key:'D', text:'jolies'}], answer: 'B' },
                { number: '5', text: 'Nous _______ au football chaque samedi.', options: [{key:'A', text:'joue'}, {key:'B', text:'joues'}, {key:'C', text:'jouons'}, {key:'D', text:'jouent'}], answer: 'C' }
            ]
        },
        {
            title: 'PAPER 2 - ESSAY',
            instructions: 'Answer the questions below.',
            marks: 40,
            questions: [
                 {
                     number: '1',
                     text: 'Ecrivez une lettre à votre ami(e) pour l\'inviter à votre anniversaire. (Write a letter to your friend inviting him/her to your birthday).',
                     answer: 'Cher ami / Chère amie,<br>Je t\'invite à mon anniversaire qui aura lieu le samedi 20 juillet chez moi. Il y aura de la musique, de la danse et beaucoup à manger. J\'espère que tu viendras.<br>Ton ami(e),<br>Kwame.'
                 },
                 {
                     number: '2',
                     text: 'Décrivez votre école. (Describe your school in about 60-80 words in French).',
                     answer: 'Mon école s\'appelle [Nom de l\'école]. Elle est située à Accra. C\'est une grande et belle école. Il y a beaucoup de salles de classe, une bibliothèque et un terrain de football. Les professeurs sont gentils et travailleurs. J\'aime mon école parce que j\'apprends beaucoup de choses intéressantes.'
                 },
                 {
                     number: '3',
                     text: 'Regardez l\'image ci-dessous (Figure 1 - WhatsApp message from Janice).<br>Répondez aux questions suivantes:<br>(a) Qui a envoyé le message?<br>(b) Où se trouve Janice?<br>(c) Qu\'est-ce qu\'elle prépare?<br>(d) Où aura lieu la fête?',
                     diagramId: 'french_2025_whatsapp',
                     answer: '(a) C\'est Janice qui a envoyé le message.<br>(b) Janice est à Cape Coast (chez son oncle).<br>(c) Elle prépare son anniversaire.<br>(d) La fête aura lieu à l\'hôtel Savoy.'
                 },
                 {
                     number: '4',
                     text: 'Traduisez les phrases suivantes en français:<br>(a) I am going to the market.<br>(b) My mother cooks rice.<br>(c) The boys are playing football.<br>(d) What is your name?',
                     answer: '(a) Je vais au marché.<br>(b) Ma mère prépare du riz / Ma mère cuisine du riz.<br>(c) Les garçons jouent au football.<br>(d) Comment t\'appelles-tu? / Comment vous appelez-vous?'
                 }
            ]
        }
    ]
  }
];
