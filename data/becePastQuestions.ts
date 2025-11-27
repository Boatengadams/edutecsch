
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
    <div class="my-4 flex justify-center">
      <svg width="500" height="400" viewBox="0 0 500 400" xmlns="http://www.w3.org/2000/svg" style="background-color:white; border-radius:8px; padding:10px; border:1px solid #e2e8f0;">
        <!-- Definitions for markers -->
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#333" />
          </marker>
        </defs>

        <!-- Stage A (Left) -->
        <ellipse cx="80" cy="200" rx="40" ry="25" fill="#e0f2fe" stroke="#0284c7" stroke-width="2" />
        <text x="80" y="205" text-anchor="middle" font-weight="bold" font-size="16">A</text>

        <!-- Stage B (Top) -->
        <ellipse cx="250" cy="50" rx="40" ry="25" fill="#e0f2fe" stroke="#0284c7" stroke-width="2" />
        <text x="250" y="55" text-anchor="middle" font-weight="bold" font-size="16">B</text>

        <!-- Stage C (Center) -->
        <ellipse cx="250" cy="200" rx="40" ry="25" fill="#e0f2fe" stroke="#0284c7" stroke-width="2" />
        <text x="250" y="205" text-anchor="middle" font-weight="bold" font-size="16">C</text>

        <!-- Stage D (Below C) -->
        <ellipse cx="250" cy="300" rx="40" ry="25" fill="#e0f2fe" stroke="#0284c7" stroke-width="2" />
        <text x="250" y="305" text-anchor="middle" font-weight="bold" font-size="16">D</text>
        
        <!-- Fossil Fuel (Bottom of D) -->
        <ellipse cx="250" cy="370" rx="50" ry="20" fill="#fef3c7" stroke="#d97706" stroke-width="2" />
        <text x="250" y="375" text-anchor="middle" font-size="12" font-weight="bold">Fossil Fuel</text>
        <line x1="250" y1="325" x2="250" y2="350" stroke="#333" stroke-width="2" />

        <!-- Factories (Right) -->
        <ellipse cx="420" cy="100" rx="60" ry="30" fill="#fee2e2" stroke="#dc2626" stroke-width="2" />
        <text x="420" y="105" text-anchor="middle" font-size="12" font-weight="bold">Factories</text>

        <!-- Arrows & Labels -->
        <!-- A -> B (P) -->
        <path d="M95 180 Q 150 100 215 60" stroke="#333" stroke-width="2" fill="none" marker-end="url(#arrowhead)" />
        <text x="140" y="110" font-weight="bold" font-size="14">P</text>

        <!-- B -> C (Q) -->
        <line x1="250" y1="75" x2="250" y2="165" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)" />
        <text x="260" y="120" font-weight="bold" font-size="14">Q</text>
        <text x="260" y="140" font-size="10" fill="#666">animal respiration</text>

        <!-- B -> A (From previous request) -->
        <path d="M215 55 Q 120 100 85 175" stroke="#333" stroke-width="2" fill="none" marker-end="url(#arrowhead)" />

        <!-- C -> D -->
        <line x1="250" y1="225" x2="250" y2="265" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)" />

        <!-- D -> A (S) -->
        <path d="M215 310 Q 120 310 90 235" stroke="#333" stroke-width="2" fill="none" marker-end="url(#arrowhead)" />
        <text x="150" y="330" font-weight="bold" font-size="14">S</text>

        <!-- B -> Factories (T) -->
        <line x1="290" y1="60" x2="370" y2="90" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)" />
        <text x="330" y="70" font-weight="bold" font-size="14">T</text>
      </svg>
    </div>
  `,
  'is_2025_q1b_farming': `
    <div class="my-4 flex flex-col md:flex-row justify-center gap-8">
      <!-- System K -->
      <div class="flex flex-col items-center">
        <h4 class="font-bold mb-2">System K</h4>
        <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style="background-color:white; border-radius:8px; padding:5px; border:1px solid #e2e8f0;">
          <defs>
            <marker id="arrowheadK" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#15803d" />
            </marker>
          </defs>
          
          <!-- Blocks -->
          <rect x="20" y="20" width="70" height="70" fill="#dcfce7" stroke="#166534" />
          <text x="55" y="50" text-anchor="middle" font-size="12" font-weight="bold">A</text>
          <text x="55" y="70" text-anchor="middle" font-size="10">Year 1</text>

          <rect x="110" y="20" width="70" height="70" fill="#dcfce7" stroke="#166534" />
          <text x="145" y="50" text-anchor="middle" font-size="12" font-weight="bold">B</text>
          <text x="145" y="70" text-anchor="middle" font-size="10">Year 4</text>

          <rect x="110" y="110" width="70" height="70" fill="#dcfce7" stroke="#166534" />
          <text x="145" y="140" text-anchor="middle" font-size="12" font-weight="bold">C</text>
          <text x="145" y="160" text-anchor="middle" font-size="10">Year 7</text>

          <rect x="20" y="110" width="70" height="70" fill="#dcfce7" stroke="#166534" />
          <text x="55" y="140" text-anchor="middle" font-size="12" font-weight="bold">D</text>
          <text x="55" y="160" text-anchor="middle" font-size="10">Year 10</text>

          <!-- Arrows -->
          <line x1="90" y1="55" x2="110" y2="55" stroke="#15803d" stroke-width="2" marker-end="url(#arrowheadK)" />
          <line x1="145" y1="90" x2="145" y2="110" stroke="#15803d" stroke-width="2" marker-end="url(#arrowheadK)" />
          <line x1="110" y1="145" x2="90" y2="145" stroke="#15803d" stroke-width="2" marker-end="url(#arrowheadK)" />
          <line x1="55" y1="110" x2="55" y2="90" stroke="#15803d" stroke-width="2" marker-end="url(#arrowheadK)" />
        </svg>
      </div>

      <!-- System L -->
      <div class="flex flex-col items-center">
        <h4 class="font-bold mb-2">System L</h4>
        <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style="background-color:white; border-radius:8px; padding:5px; border:1px solid #e2e8f0;">
           <!-- Divided Farmland -->
           <rect x="20" y="20" width="160" height="160" fill="none" stroke="#333" stroke-width="2" />
           <line x1="100" y1="20" x2="100" y2="180" stroke="#333" stroke-width="1" />
           <line x1="20" y1="100" x2="180" y2="100" stroke="#333" stroke-width="1" />
           
           <!-- Plots -->
           <text x="60" y="60" text-anchor="middle" font-weight="bold">Plot 1</text>
           <text x="140" y="60" text-anchor="middle" font-weight="bold">Plot 2</text>
           <text x="140" y="140" text-anchor="middle" font-weight="bold">Plot 3</text>
           <text x="60" y="140" text-anchor="middle" font-weight="bold">Plot 4</text>

           <!-- Circular Flow Arrows -->
           <path d="M 70 40 Q 100 20 130 40" fill="none" stroke="#ea580c" stroke-width="2" marker-end="url(#arrowheadK)" />
           <path d="M 160 70 Q 180 100 160 130" fill="none" stroke="#ea580c" stroke-width="2" marker-end="url(#arrowheadK)" />
           <path d="M 130 160 Q 100 180 70 160" fill="none" stroke="#ea580c" stroke-width="2" marker-end="url(#arrowheadK)" />
           <path d="M 40 130 Q 20 100 40 70" fill="none" stroke="#ea580c" stroke-width="2" marker-end="url(#arrowheadK)" />
        </svg>
      </div>
    </div>
  `,
  'is_2025_q1c_inclined_plane': `
    <div class="my-4 flex justify-center">
      <svg width="500" height="300" viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg" style="background-color:white; border-radius:8px; padding:10px; border:1px solid #e2e8f0;">
        <defs>
            <marker id="arrowheadF" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#000" />
            </marker>
        </defs>
        
        <!-- Ground Line -->
        <line x1="40" y1="280" x2="460" y2="280" stroke="#000" stroke-width="1.5" />
        
        <!-- Inclined Plane (Triangle) -->
        <path d="M40 280 L400 120 L400 280 Z" fill="none" stroke="#000" stroke-width="1.5" />
        
        <!-- Slab/Box (W2) -->
        <!-- Rotated to match slope angle approx 24 deg -->
        <g transform="translate(200, 210) rotate(-24)">
            <rect x="-35" y="-25" width="70" height="50" fill="#e5e7eb" stroke="#000" stroke-width="1.5" />
            <text x="0" y="5" text-anchor="middle" font-weight="bold" font-size="18" font-family="serif">W<tspan dy="4" font-size="12">2</tspan></text>
        </g>
        
        <!-- Mason (Stick figure style with volume) -->
        <g transform="translate(350, 140)">
             <!-- Head with Hat -->
             <path d="M0 -15 A10 10 0 1 1 0 5 A10 10 0 1 1 0 -15 Z" fill="white" stroke="black" stroke-width="1.5" />
             <path d="M-12 -5 L12 -5" stroke="black" stroke-width="1.5" fill="none" /> <!-- Hat brim -->
             <path d="M-10 -5 Q 0 -18 10 -5" fill="white" stroke="black" stroke-width="1.5" /> <!-- Hat top -->
             
             <!-- Body (Leaning forward) -->
             <path d="M0 5 L15 40" stroke="black" stroke-width="1.5" fill="none" />
             
             <!-- Legs (Walking) -->
             <path d="M15 40 L0 75 L10 78" stroke="black" stroke-width="1.5" fill="none" /> <!-- Back leg -->
             <path d="M15 40 L35 70 L45 70" stroke="black" stroke-width="1.5" fill="none" /> <!-- Front leg -->
             
             <!-- Arms (Reaching back to rope) -->
             <path d="M10 15 L-10 30" stroke="black" stroke-width="1.5" fill="none" />
        </g>
        
        <!-- Rope -->
        <line x1="235" y1="195" x2="340" y2="160" stroke="#000" stroke-width="1.5" />
        
        <!-- Force I (Tension) -->
        <line x1="280" y1="180" x2="310" y2="170" stroke="#000" stroke-width="1.5" marker-end="url(#arrowheadF)" />
        <text x="290" y="165" font-weight="bold" font-size="16" font-family="serif">I</text>
        
        <!-- Force II (Weight) -->
        <line x1="200" y1="210" x2="200" y2="270" stroke="#000" stroke-width="1.5" marker-end="url(#arrowheadF)" />
        <text x="210" y="270" font-weight="bold" font-size="16" font-family="serif">II</text>
        
        <!-- Force III (Reaction) -->
        <!-- Perpendicular to slope from base of box -->
        <line x1="190" y1="235" x2="175" y2="195" stroke="#000" stroke-width="1.5" marker-end="url(#arrowheadF)" />
        <text x="165" y="225" font-weight="bold" font-size="16" font-family="serif">III</text>

        <!-- Label for Figure 1(c) -->
        <text x="250" y="330" text-anchor="middle" font-weight="bold" font-size="14">Figure 1(c)</text>
      </svg>
    </div>
  `,
  'is_2025_q1d_experiments': `
    <div class="my-4 flex flex-col lg:flex-row justify-center gap-8">
      <!-- Setup A: Distillation -->
      <div class="flex flex-col items-center">
        <h4 class="font-bold mb-2 text-lg">A</h4>
        <svg width="250" height="350" viewBox="0 0 250 350" xmlns="http://www.w3.org/2000/svg" style="background-color:white; border-radius:8px; padding:5px; border:1px solid #e2e8f0;">
          <defs>
             <marker id="arrowD" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <polygon points="0 0, 6 3, 0 6" fill="#000" />
             </marker>
          </defs>
          
          <!-- Retort Stand -->
          <rect x="40" y="310" width="60" height="10" fill="white" stroke="black" stroke-width="1.5"/>
          <line x1="70" y1="310" x2="70" y2="50" stroke="black" stroke-width="2" />
          <line x1="70" y1="140" x2="110" y2="140" stroke="black" stroke-width="1.5" /> <!-- Clamp -->
          
          <!-- Heat Source (i) -->
          <rect x="100" y="280" width="20" height="40" fill="white" stroke="black" stroke-width="1.5"/>
          <path d="M105 280 Q 110 240 115 280" fill="white" stroke="black" stroke-width="1.5" />
          <text x="90" y="290" font-weight="bold" font-size="14" font-family="serif">i</text>

          <!-- Boiling Flask (IV) -->
          <circle cx="110" cy="210" r="35" fill="none" stroke="black" stroke-width="1.5" />
          <rect x="100" y="160" width="20" height="50" fill="white" stroke="none" /> <!-- Mask for neck -->
          <line x1="100" y1="180" x2="100" y2="100" stroke="black" stroke-width="1.5" /> <!-- Left Neck -->
          <line x1="120" y1="180" x2="120" y2="130" stroke="black" stroke-width="1.5" /> <!-- Right Neck base -->
          <text x="70" y="220" font-weight="bold" font-size="14" font-family="serif">IV</text>

          <!-- Thermometer (I) -->
          <line x1="110" y1="120" x2="110" y2="60" stroke="black" stroke-width="1.5" />
          <circle cx="110" cy="125" r="3" fill="black" />
          <line x1="110" y1="80" x2="80" y2="80" stroke="black" stroke-width="1" />
          <text x="65" y="85" font-weight="bold" font-size="14" font-family="serif">I</text>
          
          <!-- Liebig Condenser (V, II) -->
          <!-- Outer Jacket -->
          <path d="M120 130 L190 200" stroke="black" stroke-width="20" stroke-linecap="butt" stroke-opacity="0.1" />
          <line x1="120" y1="125" x2="195" y2="200" stroke="black" stroke-width="1.5" /> <!-- Top edge -->
          <line x1="125" y1="135" x2="185" y2="195" stroke="black" stroke-width="1.5" /> <!-- Bottom edge -->
          
          <!-- Inner Tube -->
          <line x1="120" y1="130" x2="200" y2="210" stroke="black" stroke-width="1.5" /> 
          
          <line x1="115" y1="150" x2="90" y2="150" stroke="black" stroke-width="1" />
          <text x="75" y="155" font-weight="bold" font-size="14" font-family="serif">V</text>

          <line x1="170" y1="170" x2="170" y2="210" stroke="black" stroke-width="1" />
          <text x="165" y="225" font-weight="bold" font-size="14" font-family="serif">II</text>

          <!-- Water Out/In Labels -->
          <line x1="180" y1="185" x2="190" y2="175" stroke="black" stroke-width="1" marker-end="url(#arrowD)" />
          <text x="195" y="175" font-size="10" font-family="serif">Water out</text>
          
          <line x1="140" y1="165" x2="150" y2="175" stroke="black" stroke-width="1" marker-end="url(#arrowD)" />
          <text x="115" y="185" font-size="10" font-family="serif">Water in</text>

          <!-- Receiver Flask (III) -->
          <path d="M190 250 L210 250 L220 300 L180 300 Z" fill="none" stroke="black" stroke-width="1.5" />
          <text x="225" y="280" font-weight="bold" font-size="14" font-family="serif">III</text>
          
          <!-- Drip -->
          <path d="M200 210 L200 230" stroke="black" stroke-width="1" stroke-dasharray="2,2" />
          <circle cx="200" cy="240" r="2" fill="black" />
        </svg>
      </div>

      <!-- Setup B: Magnetism -->
      <div class="flex flex-col items-center">
        <h4 class="font-bold mb-2 text-lg">B</h4>
        <svg width="200" height="350" viewBox="0 0 200 350" xmlns="http://www.w3.org/2000/svg" style="background-color:white; border-radius:8px; padding:5px; border:1px solid #e2e8f0;">
           <!-- Horseshoe Magnet (VI) -->
           <!-- Back curve -->
           <path d="M60 80 L60 150 Q 60 190 100 190 Q 140 190 140 150 L140 80" fill="none" stroke="black" stroke-width="25" stroke-linecap="butt" />
           <!-- Front face/gap -->
           <path d="M60 80 L60 150 Q 60 190 100 190 Q 140 190 140 150 L140 80" fill="none" stroke="white" stroke-width="22" stroke-linecap="butt" />
           <path d="M60 80 L60 150 Q 60 190 100 190 Q 140 190 140 150 L140 80" fill="none" stroke="black" stroke-width="1.5" />
           
           <!-- Shading for magnet poles -->
           <rect x="48" y="130" width="24" height="20" fill="#555" />
           <rect x="128" y="130" width="24" height="20" fill="#555" />

           <line x1="50" y1="110" x2="20" y2="110" stroke="black" stroke-width="1" />
           <text x="5" y="115" font-weight="bold" font-size="14" font-family="serif">VI</text>

           <!-- Petri Dish -->
           <ellipse cx="100" cy="250" rx="70" ry="15" fill="none" stroke="black" stroke-width="1.5" />
           <path d="M30 250 V 270 A 70 15 0 0 0 170 270 V 250" fill="none" stroke="black" stroke-width="1.5" />
           
           <!-- Iron Filings (VII) -->
           <!-- Clumped at poles -->
           <path d="M50 150 Q 60 200 70 150" fill="black" />
           <path d="M130 150 Q 140 200 150 150" fill="black" />
           <!-- Scattering in dish -->
           <g fill="black">
              <circle cx="80" cy="250" r="1" /><circle cx="90" cy="255" r="1" />
              <circle cx="100" cy="245" r="1" /><circle cx="110" cy="252" r="1" />
              <circle cx="120" cy="248" r="1" />
           </g>
           
           <line x1="170" y1="220" x2="140" y2="160" stroke="black" stroke-width="1" />
           <text x="175" y="225" font-weight="bold" font-size="14" font-family="serif">VII</text>
        </svg>
      </div>
    </div>
  `,
  'is_2023_q1c_symbols_answer': `<div class="my-4 flex justify-center"><img src="https://i.imgur.com/G9c2X3f.png" alt="Electronic component symbols" class="max-w-full h-auto rounded-lg bg-white p-2"></div>`,
  'is_2023_q1c_circuit_answer': `<div class="my-4 flex justify-center"><img src="https://i.imgur.com/fLz8w2D.png" alt="Circuit diagram for forward biasing" class="max-w-full h-auto rounded-lg bg-white p-2"></div>`,
  'is_2023_q5c_foodweb_answer': `<div class="my-4 flex justify-center"><img src="https://i.imgur.com/3fR1zYw.png" alt="Food web diagram" class="max-w-full h-auto rounded-lg bg-white p-2"></div>`,
  'computing_q1a_flowchart_answer': `<div class="my-4 flex justify-center">
     <img src="https://storage.googleapis.com/aistudio-hub-generative-ai-app-builder-public/user-assets/2024-07-22/19:48:30.939Z/image-4.jpeg" alt="Flowchart Answer" class="max-w-sm h-auto rounded-lg bg-white p-2">
  </div>`,
  'computing_q1d_topologies_answer': `<div class="my-4 flex flex-col items-center gap-4">
     <p><b>Ring Topology</b></p>
     <img src="https://storage.googleapis.com/aistudio-hub-generative-ai-app-builder-public/user-assets/2024-07-22/19:48:30.938Z/image-2.jpeg" alt="Ring Topology" class="max-w-sm h-auto rounded-lg bg-white p-2" style="clip-path: inset(5% 0 70% 0);">
     <p><b>Bus Topology</b></p>
     <img src="https://storage.googleapis.com/aistudio-hub-generative-ai-app-builder-public/user-assets/2024-07-22/19:48:30.938Z/image-2.jpeg" alt="Bus Topology" class="max-w-sm h-auto rounded-lg bg-white p-2" style="clip-path: inset(30% 0 35% 0);">
     <p><b>Mesh Topology</b></p>
     <img src="https://storage.googleapis.com/aistudio-hub-generative-ai-app-builder-public/user-assets/2024-07-22/19:48:30.938Z/image-2.jpeg" alt="Mesh Topology" class="max-w-sm h-auto rounded-lg bg-white p-2" style="clip-path: inset(65% 0 5% 0);">
  </div>`,
   'computing_q2c_excel_question': `<div class="my-4 flex justify-center">
    <img src="https://storage.googleapis.com/aistudio-hub-generative-ai-app-builder-public/user-assets/2024-07-22/20:41:00.612Z/image-11.jpeg" alt="Excel Question Figure 1" class="max-w-full h-auto rounded-lg" style="max-height: 200px; clip-path: inset(28% 0 52% 0); -webkit-clip-path: inset(28% 0 52% 0);">
  </div>`,
  'math_2025_pie_chart': `<div class="my-4 flex justify-center">
    <img src="https://storage.googleapis.com/aistudio-hub-generative-ai-app-builder-public/user-assets/2024-07-23/00:54:15.532Z/image-0.jpeg" alt="Pie chart of household items" class="max-w-full h-auto rounded-lg" style="max-height: 400px; clip-path: inset(0 0 55% 0); -webkit-clip-path: inset(0 0 55% 0);">
  </div>`,
  'math_2025_graph_answer': `<div class="my-4 flex justify-center">
    <img src="https://storage.googleapis.com/aistudio-hub-generative-ai-app-builder-public/user-assets/2024-07-23/00:54:15.532Z/image-2.jpeg" alt="Distance-time graph for Adamu's journey" class="max-w-full h-auto rounded-lg" style="max-height: 400px; clip-path: inset(0 0 65% 0); -webkit-clip-path: inset(0 0 65% 0);">
  </div>`,
  'ct_money_box': `<div class="my-4 flex justify-center">
    <img src="https://storage.googleapis.com/aistudio-hub-generative-ai-app-builder-public/user-assets/2024-07-23/02:12:44.254Z/image-0.jpeg" alt="Figure 1: Money Box" class="max-w-full h-auto rounded-lg" style="max-height: 400px; clip-path: inset(25% 0 35% 0); -webkit-clip-path: inset(25% 0 35% 0);">
  </div>`,
  'ct_l_shape': `<div class="my-4 flex justify-center">
    <img src="https://storage.googleapis.com/aistudio-hub-generative-ai-app-builder-public/user-assets/2024-07-23/02:12:44.254Z/image-1.jpeg" alt="Figure 2: L-shaped wooden block" class="max-w-full h-auto rounded-lg" style="max-height: 300px; clip-path: inset(55% 0 10% 0); -webkit-clip-path: inset(55% 0 10% 0);">
  </div>`,
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

// FIX: Add optional 'diagramId' property to the sub_questions type to allow diagrams within sub-questions.
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
            title: 'PAPER 2 - SECTION A',
            instructions: 'Answer all of Question 1. [40 marks]',
            marks: 40,
            questions: [
                {
                    number: '1',
                    text: '',
                    sub_questions: [
                        {
                            number: '(a)',
                            text: 'The diagram below illustrates a natural cycle labeled Figure 1a. Study it carefully and answer the questions that follow.',
                            diagramId: 'is_2025_q1a_cycle',
                            answer: '',
                            sub_parts: [
                                { number: '(i)', text: 'Identify the natural cycle illustrated in the diagram.', answer: 'Carbon Cycle' },
                                { number: '(ii)', text: 'Name the stages labelled A, B, C and D.', answer: '<ul><li>A: Atmosphere / Air (CO₂)</li><li>B: Plants / Producers</li><li>C: Animals / Consumers</li><li>D: Decomposers / Soil</li></ul>' },
                                { number: '(iii)', text: 'Name the processes labelled P, Q, S and T.', answer: '<ul><li>P: Photosynthesis</li><li>Q: Feeding / Consumption</li><li>S: Decomposition / Decay (releasing CO₂)</li><li>T: Combustion / Burning (Industrial emission)</li></ul>' },
                                { number: '(iv)', text: 'State one importance of the cycle to the environment.', answer: 'It ensures the continuous availability of carbon in the ecosystem for life processes. / It helps maintain the balance of atmospheric carbon dioxide.' }
                            ]
                        },
                        {
                            number: '(b)',
                            text: 'The diagrams below labeled K and L illustrate two different farming systems. Study them carefully and answer the questions that follow.',
                            diagramId: 'is_2025_q1b_farming',
                            answer: '',
                            sub_parts: [
                                { number: '(i)', text: 'Identify the farming systems labelled K and L.', answer: '<ul><li>K: Shifting Cultivation / Land Rotation</li><li>L: Crop Rotation</li></ul>' },
                                { number: '(ii)', text: 'State two differences between system K and system L.', answer: '<ul><li>In K, the farmer moves to a new land when fertility declines, while in L, the farmer farms on the same piece of land continuously.</li><li>K requires a large area of land, while L requires less land.</li><li>K helps check pests and diseases by leaving land fallow, while L checks pests by changing crop types.</li></ul>' },
                                { number: '(iii)', text: 'State two advantages of system L over system K.', answer: '<ul><li>It ensures continuous use of the land (economical land use).</li><li>It improves soil fertility through the use of legumes.</li><li>It helps control soil erosion (land is always covered).</li><li>Yield is usually higher due to better management.</li></ul>' },
                                { number: '(iv)', text: 'In system K, why does the farmer move from farmland A to B?', answer: 'Because the soil fertility in farmland A has declined / nutrients are depleted.' }
                            ]
                        },
                        {
                            number: '(c)',
                            text: 'Figure 1(c) is an illustration of a mason pulling a slab by means of a rope up an inclined plane. The labels I, II and III represent forces acting on the slab.<br>Study the figure carefully and answer the questions that follow.',
                            diagramId: 'is_2025_q1c_inclined_plane',
                            answer: '',
                            sub_parts: [
                                { number: '(i)', text: 'Give three examples of the use of inclined planes in everyday life.', answer: '<ul><li>Ramps for loading vehicles</li><li>Staircases</li><li>Ladders leaning against a wall</li><li>Chutes / Slides</li><li>Roads winding up a hill</li></ul>' },
                                { number: '(ii)', text: 'Given that I is 400 N and moves a distance of 10 m whiles II is 100 N and moves a distance of 5 m, calculate the:<br>(α) work output;<br>(β) work input;<br>(γ) efficiency.', answer: '<p><strong>(α) Work Output:</strong><br>Work Output = Load (Weight) × Distance moved by load (Vertical height)<br>= 100 N × 5 m<br>= <strong>500 J</strong></p><p><strong>(β) Work Input:</strong><br>Work Input = Effort (Force I) × Distance moved by effort (Length of plane)<br>= 400 N × 10 m<br>= <strong>4000 J</strong></p><p><strong>(γ) Efficiency:</strong><br>Efficiency = (Work Output / Work Input) × 100%<br>= (500 / 4000) × 100%<br>= 0.125 × 100%<br>= <strong>12.5%</strong></p>' }
                            ]
                        },
                        {
                            number: '(d)',
                            text: 'Figure 1(d) is an illustration of experimental set-ups A and B used to demonstrate a scientific principle. Study the figure carefully and answer the questions that follow.',
                            diagramId: 'is_2025_q1d_experiments',
                            answer: '',
                            sub_parts: [
                                { number: '(i)', text: 'Name the scientific principle being demonstrated in both A and B.', answer: '<ul><li><strong>A:</strong> Distillation / Separation of Mixtures / Evaporation and Condensation</li><li><strong>B:</strong> Magnetism / Magnetic Attraction</li></ul>' },
                                { number: '(ii)', text: 'Describe briefly the functions of each of the parts labelled II and VI.', answer: '<ul><li><strong>II (Condenser):</strong> To cool and condense hot vapour back into liquid form.</li><li><strong>VI (Magnet):</strong> To attract magnetic materials (iron filings) from a mixture.</li></ul>' },
                                { number: '(iii)', text: 'Name any two types of materials that could be present in each of the set-ups labelled:<br>(α) III;<br>(β) VII.', answer: '<ul><li><strong>(α) III (Distillate):</strong> Pure water, Alcohol (Ethanol), Distilled liquid.</li><li><strong>(β) VII (Magnetic material):</strong> Iron filings, Nickel, Cobalt, Steel pins.</li></ul>' },
                                { number: '(iv)', text: 'Give the reason why the direction of water flow in A must not be reversed.', answer: 'To ensure the condenser is completely filled with cold water (jacket is full) for efficient cooling/condensation of the vapour.' }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            title: 'PAPER 2 - SECTION B',
            instructions: 'Answer four questions only from this section. [60 marks]',
            marks: 60,
            questions: [
                {
                    number: '2', text: '', sub_questions: [
                        { number: '(a)', text: '(i) What is the importance of a fuse in an electrical appliance?<br>(ii) State two household appliances that have fuse.', answer: '<p><strong>(i) Importance of a fuse:</strong><br>To protect electrical equipment from excessive current. <strong>OR</strong> It is used as safety measures to prevent any hazards to humans.</p><p><strong>(ii) Appliances with fuse:</strong><br><ul><li>electric iron/iron</li><li>washing machine</li><li>kettle</li><li>dishwasher</li><li>microwave</li><li>wall socket</li><li>lamps</li><li>televisions</li><li>computers</li><li>fridges / freezers etc</li></ul><em>(Any two)</em></p>' },
                        { number: '(b)', text: '(i) What is teenage pregnancy?<br>(ii) State two causes of teenage pregnancy.', answer: '<p><strong>(i) Teenage Pregnancy:</strong><br>A girl under 20 years becoming pregnant.</p><p><strong>(ii) Causes of teenage pregnancy:</strong><br><ul><li>Poverty</li><li>Single parenthood</li><li>Rape</li><li>Peer pressure etc</li></ul><em>(Any two)</em></p>' },
                        { number: '(c)', text: 'State three precautions against hazards.', answer: '<ul><li>wearing protective clothing / gadget</li><li>routine maintenance of equipment / apparatus</li><li>developing right skills for use of equipment</li><li>mounting hazards signs of Don\'ts in the laboratory / work place</li><li>carry chemicals in approved containers</li><li>always wash hands after using any unsafe material</li><li>store materials appropriately etc</li></ul><p><em>(Any three)</em></p>' },
                        { number: '(d)', text: '(i) State two practices that destroy water bodies.<br>(ii) Give two methods of conserving water bodies.', answer: '<p><strong>(i) Practices that destroy waterbodies:</strong><br><ul><li>deforestation / clearing vegetation along the river banks</li><li>bush burning</li><li>farming near water bodies</li><li>galamsey / surface mining activities</li><li>dumping of solid / liquid waste into water bodies</li><li>use of chemicals for fishing</li><li>excessive use of chemical fertilizers etc</li></ul><em>(Any two)</em></p><p><strong>(ii) Methods of conserving water bodies:</strong><br><ul><li>use of organic materials for composting</li><li>use of appropriate methods of fishing</li><li>education on effects of galamsey activities</li><li>education on defaecation into water bodies</li><li>use of erosion-control methods in farming</li><li>afforestation etc</li></ul><em>(Any two)</em></p>' }
                    ]
                },
                {
                    number: '3', text: '', sub_questions: [
                        { number: '(a)', text: '(i) What is aerobic respiration?<br>(ii) State the main difference between aerobic respiration and anaerobic respiration.', answer: '<p><strong>(i) Aerobic respiration:</strong><br>Is the breakdown / oxidation of organic food substance / glucose in the presence of oxygen to release large amount of energy, water carbon dioxide as by-products.</p><p><strong>(ii) Main difference:</strong><br>In aerobic respiration oxygen is used / in anaerobic respiration oxygen is not used.</p>' },
                        { number: '(b)', text: '(i) Explain the term potential difference.<br>(ii) The potential difference across the terminals of a 100 Ω resistor is 250 V. Calculate the current flowing through the resistor.', answer: '<p><strong>(i) Potential difference:</strong><br>Is the work done in moving a unit of positive electric charge from one point to another.</p><p><strong>(ii) Calculation:</strong><br>V = IR<br>I = V/R<br>I = 250 / 100<br>I = <strong>2.5 A</strong></p>' },
                        { number: '(c)', text: '(i) Which crop is infected by the Swollen Shoot disease?<br>(ii) State the causative organism of the disease.<br>(iii) State the method of spread of the disease.<br>(iv) Give two ways of preventing the spread of the disease.', answer: '<p><strong>(i) Crop:</strong> Cocoa</p><p><strong>(ii) Causative organism:</strong> virus / correctly named virus</p><p><strong>(iii) Method of spread:</strong> Virus transmitted by nymphs of mealy bugs from infected plant to healthy plants.</p><p><strong>(iv) Ways of preventing:</strong><br><ul><li>destroy infected trees</li><li>regular inspection of seedlings / planting materials</li><li>use of quarantine / cordin sanitaire (leaving 10m wide cocoa free zone around area)</li><li>barrier cropping</li><li>using partly tolerant hybrids / using resistant varieties</li><li>removing host free species</li></ul><em>(Any two)</em></p>' },
                        { number: '(d)', text: 'Consider the given elements: ⁷₃X and ²⁰₉Y<br>(i) Write the electron configuration for Y;<br>(ii) State the possible ion that could be formed by X to make it more stable.', answer: '<p><strong>(i) Electron configuration for Y:</strong><br>Y = 2:7</p><p><strong>(ii) Possible ion for X:</strong><br>X⁺ or Li⁺</p>' }
                    ]
                },
                {
                    number: '4', text: '', sub_questions: [
                        { number: '(a)', text: 'What is a neutralization reaction?', answer: 'Is the reaction between an acid and a base to form salt and water only.' },
                        { number: '(b)', text: 'State three physical properties of a soil.', answer: '<ul><li>water holding capacity / water retention</li><li>capillary action / capillarity</li><li>drainage ability</li><li>texture / feel</li><li>porosity / air space</li><li>nutrient content</li><li>colour</li><li>structure</li><li>temperature etc</li></ul><p><em>(Any three)</em></p>' },
                        { number: '(c)', text: '(i) Define the term power.<br>(ii) If a machine hauls a packing case of mass 50 kg up a building that is 10 m high in 30 s, calculate the power of the machine. [g = 10 m s⁻²]', answer: '<p><strong>(i) Definition of power:</strong><br>Is the rate at which work is done / energy is used. <strong>OR</strong> Energy used up / work done per unit time.</p><p><strong>(ii) Calculation of power:</strong><br>Work done = potential energy = mgh<br>Work done = 50 x 10 x 10 = 5000 J</p><p>Power = Work done / Time<br>Power = 5000 / 30 = 166.67 / 166.7 W</p>' },
                        { number: '(d)', text: 'State four areas where technology is used for the benefit of humans.', answer: '<ul><li>used in irrigation system / construction of dams / canals</li><li>used in communication industries / use of computers / satellites / telephones</li><li>electronic industry</li><li>metallurgical industry / iron and steel industry</li><li>food processing / preservation industry</li><li>energy sector / generation of electricity / nuclear energy</li><li>oil and gas industry</li><li>medicine</li><li>transportation industry / use of vehicles / trains / aeroplanes etc</li></ul><p><em>(Any four)</em></p>' }
                    ]
                },
                {
                    number: '5', text: '', sub_questions: [
                        { number: '(a)', text: 'State three ways in which mulching restores soil resources.', answer: '<ul><li>adds organic matter to soil</li><li>checks erosion</li><li>conserves soil nutrients</li><li>increases water-holding capacity of soil / reduces loss of water through evaporation</li><li>improves activity of soil organisms</li></ul><p><em>(Any three)</em></p>' },
                        { number: '(b)', text: '(i) Name the two elements that combine to form ammonia gas.<br>(ii) Write a balanced chemical equation for the formation of ammonia from the elements named in (i).', answer: '<p><strong>(i) Elements:</strong> Nitrogen and hydrogen</p><p><strong>(ii) Equation:</strong> N₂ + 3H₂ → 2NH₃</p>' },
                        { number: '(c)', text: 'The following information is on the feeding habits of some organisms:<br>(i) man feeds on grasscutter;<br>(ii) toad feeds on grasshopper;<br>(iii) snake feeds on toad;<br>(iv) goat feeds on grass;<br>(v) man feeds on hawk;<br>(vi) grasshopper feeds on grass;<br>(vii) hawk feeds on snake;<br>(viii) grasscutter feeds on grass.<br>Use all the information given above to construct a food web.', answer: '<div class="diagram-container" data-diagramid="is_2023_q5c_foodweb_answer"></div>' },
                        { number: '(d)', text: '(i) What is a galaxy?<br>(ii) State the relationship between stars and galaxies.<br>(iii) Explain briefly the term milky way.', answer: '<p><strong>(i) Galaxy:</strong><br>Is a group of stars. <strong>OR</strong> A system of stars, gases, dust / dark matter held together in the heavens / space. <strong>OR</strong> A collection of billions of stars that show a common gravitational link.</p><p><strong>(ii) Relationship:</strong><br>Galaxies are held together by gravitational attraction much like a solar system while stars in the solar systems combine to form galaxies. <strong>OR</strong> Stars makes up the galaxies. <strong>OR</strong> Galaxies are made up of several billions of stars.</p><p><strong>(iii) Milky Way:</strong><br>Is the galaxy that contains the solar system and the earth. <strong>OR</strong> A hazy band of light seen in the night sky formed from stars that cannot be individually distinguished by the naked eye.</p>' }
                    ]
                },
                {
                    number: '6', text: '', sub_questions: [
                        { number: '(a)', text: '(i) State three effects of soil erosion on the growth of crop plants.<br>(ii) Mention one method of controlling soil erosion.', answer: '<p><strong>(i) Effects of soil erosion:</strong><br><ul><li>poor yield</li><li>death of crop</li><li>poor / stunted growth</li><li>lodging of crop plants</li><li>shows deficiency disease etc</li></ul><em>(Any three)</em></p><p><strong>(ii) Method of controlling soil erosion:</strong><br><ul><li>mulching</li><li>wind breaks</li><li>crop rotation</li><li>contour ploughing</li><li>terracing</li><li>cover cropping</li><li>strip cropping</li><li>application of organic manure</li><li>minimum / zero tillage</li><li>afforestation etc</li></ul><em>(Any one)</em></p>' },
                        { number: '(b)', text: '(i) Name two science related businesses.<br>(ii) State the principles underlying the operation of each of the businesses named in (i).', answer: '<p><strong>(i) Science related businesses:</strong><br><ul><li>blacksmithing</li><li>gari processing</li><li>soap making</li><li>salt production</li><li>kenkey production</li><li>biogas production</li><li>fish smoking etc</li></ul><em>(Any two)</em></p><p><strong>(ii) Principles:</strong><br><em>(Principle must correspond to business stated in (i) to score)</em><br><ul><li>blacksmithing - forging / shrinking / bonding / malleability</li><li>gari processing - fermentation</li><li>soap making - saponification</li><li>salt production - evaporation</li><li>kenkey production - fermentation</li><li>biogas production - decomposition</li><li>fish smoking - dehydration / drying etc</li></ul><em>(Any two)</em></p>' },
                        { number: '(c)', text: '(i) Explain how the female Anopheles mosquito transmits malaria to humans.<br>(ii) State one chemical method of controlling mosquitoes.', answer: '<p><strong>(i) Transmission of malaria:</strong><br>It bites an infected person, takes in blood infected with the malaria parasite. The parasite grows and matures in the mosquitos gut, then travels to the salivary glands. When the mosquito bites another person, it releases the parasites into the victim\'s body.</p><p><strong>(ii) Chemical control of mosquito:</strong><br><ul><li>adding oil / kerosene on surface of stagnant water</li><li>spraying with insecticide</li><li>using treated mosquito nets</li><li>use of mosquito coil</li></ul><em>(Any one)</em></p>' },
                        { number: '(d)', text: '(i) Name two fundamental units of measurement.<br>(ii) State the physical quantity that one of the units named in (i) measures.', answer: '<p><strong>(i) Fundamental units:</strong><br><ul><li>metre</li><li>second</li><li>kilogram</li><li>degree celcius / kelvin etc</li><li>Candela</li></ul><em>(Any two)</em></p><p><strong>(ii) Physical quantity:</strong><br><em>(Named unit must correspond to physical quantity to score)</em><br><ul><li>metre - length</li><li>second - time</li><li>kilogram - mass</li><li>degree celcius / kelvin - temperature</li><li>Candela - Luminous intensity etc</li></ul><em>(Any one)</em></p>' }
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
        instructions: 'Answer all the questions in this section.',
        marks: 40,
        questions: [
            { number: '1', text: 'In which continent are the Appalachian mountains located?', options: [{key: 'A', text: 'Africa'}, {key: 'B', text: 'North America'}, {key: 'C', text: 'South America'}, {key: 'D', text: 'Australia'}], answer: 'B' },
            { number: '2', text: 'The main purpose of sex education in Ghanaian schools is to', options: [{key: 'A', text: 'increase the likelihood of early marriage.'}, {key: 'B', text: 'promote reproductive health and responsible behavior.'}, {key: 'C', text: 'discourage communication between adolescents and health care providers.'}, {key: 'D', text: 'promote chastity among adolescents.'}], answer: 'B' },
            { number: '3', text: 'One of the effective ways by which parents carry out socialization of the family members is by', options: [{key: 'A', text: 'teaching them the importance of drum music and dance.'}, {key: 'B', text: 'telling them ancient stories.'}, {key: 'C', text: 'rebuking and punitive punishment.'}, {key: 'D', text: 'open communication and admonishment.'}], answer: 'D' },
            { number: '4', text: "In what way does the ageing population of Ghana affect the country's health system? It", options: [{key: 'A', text: 'decreases the demand for healthcare services.'}, {key: 'B', text: 'increases the burden on healthcare resources.'}, {key: 'C', text: 'leads to a surplus of healthcare professionals.'}, {key: 'D', text: 'reduces the supply of medication to children.'}], answer: 'B' },
            { number: '5', text: 'What role does Social Security and National Insurance Trust (SSNIT) play in the life of a pensioner?', options: [{key: 'A', text: 'Payment of social benefits and all health needs'}, {key: 'B', text: 'Provision of a source of income after retirement'}, {key: 'C', text: 'Promotion of independence in old age'}, {key: 'D', text: 'Promotion of reliance on government welfare program'}], answer: 'B' },
            { number: '6', text: 'A lot of foreigners visit Ghana yearly to see beautiful sceneries. By this, they contribute to the economy through', options: [{key: 'A', text: 'exploitation of natural resources.'}, {key: 'B', text: 'exploitation of culture.'}, {key: 'C', text: 'revenue generation and foreign exchange.'}, {key: 'D', text: 'developing infrastructure only.'}], answer: 'C' },
            { number: '7', text: "What role does cultural tourism play in preserving Ghana's traditional heritage? It", options: [{key: 'A', text: 'promotes drumming and dancing.'}, {key: 'B', text: 'promotes cultural exchange and appreciation of our way of life.'}, {key: 'C', text: 'facilitates access to traditional artefacts in the community.'}, {key: 'D', text: 'exposes cultural activities.'}], answer: 'B' },
            { number: '8', text: "In 1948, there was a riot following the killing of three ex-servicemen at the Osu Christianborg Castle Cross roads. What significant impact did it have on nationalists activities in the Gold Coast? It", options: [{key: 'A', text: 'resulted in the transfer of the governor.'}, {key: 'B', text: 'strengthened agitation against colonial administration.'}, {key: 'C', text: 'encouraged patriotism and respect for rule of law.'}, {key: 'D', text: 'strengthened colonial rule against the nationalists.'}], answer: 'B' },
            { number: '9', text: 'Which of the following options is the most destructive of volcanic eruption on the environment?', options: [{key: 'A', text: 'Gas emission'}, {key: 'B', text: 'Water pollution'}, {key: 'C', text: 'Lava flows on vegetation'}, {key: 'D', text: 'Loss of lives and property'}], answer: 'D' },
            { number: '10', text: 'The demarcation of administrative regions and districts of Ghana are best highlighted on', options: [{key: 'A', text: 'an imaginary map.'}, {key: 'B', text: 'an economic map.'}, {key: 'C', text: 'a political map.'}, {key: 'D', text: 'a historical map.'}], answer: 'C' },
            { number: '11', text: 'Sanitation has been a major challenge in some communities in Ghana. What is the most sustainable way to improve sanitation in your community?', options: [{key: 'A', text: 'Building more landfills for waste disposal'}, {key: 'B', text: 'Providing many incinerators in the community'}, {key: 'C', text: 'Recycling and education'}, {key: 'D', text: 'Sweeping and collecting waste materials in the community'}], answer: 'C' },
            { number: '12', text: 'Why is it useful to provide a legend on a map? To', options: [{key: 'A', text: 'display the title'}, {key: 'B', text: 'show the compass direction'}, {key: 'C', text: 'explain the symbols'}, {key: 'D', text: 'indicate the scale'}], answer: 'C' },
            { number: '13', text: 'Contours on a map indicate what phenomenon?', options: [{key: 'A', text: 'Elevation changes'}, {key: 'B', text: 'Temperate changes'}, {key: 'C', text: 'Pressure changes'}, {key: 'D', text: 'Population changes'}], answer: 'A' },
            { number: '14', text: 'How do forests and woodlands contribute to the economy of Ghana?', options: [{key: 'A', text: 'They provide food only for local consumption.'}, {key: 'B', text: 'They serve as habitat for a variety of animal species.'}, {key: 'C', text: 'They provide timber and non-timber products for export.'}, {key: 'D', text: 'They contribute to the beauty of the landscape.'}], answer: 'C' },
            { number: '15', text: 'How has the migration of the youth from rural areas to urban centres affected agriculture in Ghana?', options: [{key: 'A', text: 'Increase in agricultural production.'}, {key: 'B', text: 'Increase in agricultural labour.'}, {key: 'C', text: 'Decrease in agricultural labour.'}, {key: 'D', text: 'Decrease in post-harvest losses.'}], answer: 'C' },
            { number: '16', text: 'Which of the following towns is noted for the mining of diamond in Ghana?', options: [{key: 'A', text: 'Akwatia'}, {key: 'B', text: 'Obuasi'}, {key: 'C', text: 'Prestea'}, {key: 'D', text: 'Tarkwa'}], answer: 'A' },
            { number: '17', text: 'What is the main purpose of checks and balances in a democratic system of government?', options: [{key: 'A', text: 'To ensure that one arm of government does not become too powerful.'}, {key: 'B', text: 'To concentrate power in the hands of the executive.'}, {key: 'C', text: 'To create a system of government that is inefficient and slow.'}, {key: 'D', text: 'To promote corruption and abuse of power.'}], answer: 'A' },
            { number: '18', text: 'The main difference between a written and unwritten constitution is', options: [{key: 'A', text: 'the length of the constitution.'}, {key: 'B', text: 'the manner in which they are presented.'}, {key: 'C', text: 'the language in which they are written.'}, {key: 'D', text: 'the number of articles they contain.'}], answer: 'B' },
            { number: '19', text: 'Which of the following is not a symbol of national unity in Ghana?', options: [{key: 'A', text: 'The National Anthem'}, {key: 'B', text: 'The Coat of Arms'}, {key: 'C', text: 'The National Flag'}, {key: 'D', text: 'The National ID card'}], answer: 'D' },
        ]
      }
    ]
  },
  {
    year: 2025,
    subject: 'Mathematics',
    sections: [
        {
            title: 'PAPER 2 - SECTION B (Data Interpretation)',
            instructions: 'Answer all questions.',
            marks: 30,
            questions: [
                {
                    number: '1',
                    text: 'The pie chart below shows the distribution of household items sold by a store in a month. Use it to answer the questions that follow.',
                    diagramId: 'math_2025_pie_chart',
                    sub_questions: [
                        { number: '(a)', text: 'If the total number of items sold was 1200, calculate the number of Fans sold.', answer: 'Angle for Fans = 360 - (90+60+120) = 90 degrees.<br>Number of Fans = (90/360) * 1200 = 300 fans.' },
                        { number: '(b)', text: 'What percentage of the sales corresponds to Televisions?', answer: 'Angle for TV = 120 degrees.<br>Percentage = (120/360) * 100 = 33.33%' }
                    ]
                },
                {
                    number: '2',
                    text: 'The graph below shows the journey of Adamu from Town A to Town B.',
                    diagramId: 'math_2025_graph_answer',
                    sub_questions: [
                        { number: '(a)', text: 'Calculate the average speed for the entire journey.', answer: 'Total Distance = 120km. Total Time = 4 hours. Speed = 120/4 = 30 km/h' },
                        { number: '(b)', text: 'At what time did Adamu stop for a rest?', answer: 'The graph is horizontal between 10:00 am and 10:30 am.' }
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
            title: 'PAPER 2 - PRACTICAL SKILLS',
            instructions: 'Answer all questions.',
            marks: 40,
            questions: [
                {
                    number: '1',
                    text: '(a) Study the flowchart below and describe the process it represents.<br>(b) Identify the network topologies labelled A, B, and C below.',
                    diagramId: 'computing_q1d_topologies_answer',
                    sub_questions: [
                        { number: '(a)', text: 'Identify the flowchart symbols.', diagramId: 'computing_q1a_flowchart_answer', answer: 'The flowchart represents a decision-making process (Diamond shape) leading to either a Process (Rectangle) or End state (Oval).' },
                        { number: '(b)', text: 'Name the topologies.', answer: 'A: Ring Topology<br>B: Bus Topology<br>C: Mesh Topology' }
                    ]
                },
                {
                    number: '2',
                    text: 'The image below shows a spreadsheet interface. Write the formula to calculate the total for the selected range.',
                    diagramId: 'computing_q2c_excel_question',
                    answer: '=SUM(B2:B5)'
                }
            ]
        }
    ]
  },
  {
    year: 2025,
    subject: 'Career Technology',
    sections: [
        {
            title: 'PAPER 2 - DESIGN & MAKE',
            instructions: 'Answer all questions.',
            marks: 30,
            questions: [
                {
                    number: '1',
                    text: 'Figure 1 shows a wooden artifact. Name the artifact and state two tools used in making it.',
                    diagramId: 'ct_money_box',
                    answer: 'Artifact: Money Box.<br>Tools: Tenon saw, Jack plane, Hammer, Chisel.'
                },
                {
                    number: '2',
                    text: 'Figure 2 shows an L-shaped block. Draw the plan view.',
                    diagramId: 'ct_l_shape',
                    answer: 'The plan view would be two rectangles joined at a right angle, viewed from above.'
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
            title: 'PAPER 1 - COMPREHENSION',
            instructions: 'Lisez le passage et répondez aux questions.',
            marks: 20,
            questions: [
                {
                    number: '1',
                    text: 'Read the WhatsApp message below and answer the questions.',
                    diagramId: 'french_2025_whatsapp',
                    sub_questions: [
                        { number: '(a)', text: 'Qui a envoyé le message?', answer: 'C\'est Janice qui a envoyé le message.' },
                        { number: '(b)', text: 'Où se trouve Janice?', answer: 'Elle est à Cape Coast.' },
                        { number: '(c)', text: 'Pourquoi invite-t-elle son ami?', answer: 'Pour son anniversaire.' }
                    ]
                }
            ]
        }
    ]
  },
  { 
    year: 2025, 
    subject: 'English Language', 
    sections: [{ 
        title: 'PAPER 2 - ESSAY', 
        instructions: 'Answer one question from this section.', 
        marks: 30, 
        questions: [{ 
            number: '1', 
            text: 'Your friend in another school has written to you about his/her difficulties in Science. Write a reply to him/her explaining at least three ways he/she can improve his/her grades.', 
            answer: 'Content: 10 marks (clarity of points). Organization: 5 marks (letter format). Expression: 10 marks. Mechanical Accuracy: 5 marks.' 
        }] 
    }] 
  },
  { 
    year: 2025, 
    subject: 'Religious and Moral Education', 
    sections: [{ 
        title: 'PAPER 2 - RELIGION', 
        instructions: 'Answer all questions.', 
        marks: 40, 
        questions: [{ 
            number: '1', 
            text: '(a) Describe the call of Mohammed.<br>(b) State three moral lessons that can be learnt from the call of Mohammed.', 
            answer: '(a) Mohammed was called at Mount Hira... (b) Obedience, Patience, Humility.' 
        }] 
    }] 
  },
  { 
    year: 2025, 
    subject: 'Basic Design and Technology', 
    sections: [{ 
        title: 'PAPER 2 - CORE SKILLS', 
        instructions: 'Answer all questions.', 
        marks: 30, 
        questions: [{ 
            number: '1', 
            text: 'State three properties of Aluminum that make it suitable for cooking utensils.', 
            answer: '1. It is a good conductor of heat.<br>2. It is lightweight.<br>3. It does not rust/corrode easily.' 
        }] 
    }] 
  },
  { 
    year: 2025, 
    subject: 'I.C.T', 
    sections: [{ 
        title: 'PAPER 2 - THEORY', 
        instructions: 'Answer all questions.', 
        marks: 30, 
        questions: [{ 
            number: '1', 
            text: 'List four hardware components of a computer system and state one function of each.', 
            answer: '<ul><li>Mouse: Input device for pointing.</li><li>Keyboard: Input device for typing.</li><li>Monitor: Output device for display.</li><li>System Unit: Contains the CPU and memory.</li></ul>' 
        }] 
    }] 
  },
  { 
    year: 2025, 
    subject: 'Ghanaian Language', 
    sections: [{ 
        title: 'PAPER 2 - COMPOSITION', 
        instructions: 'Answer all questions.', 
        marks: 40, 
        questions: [{ 
            number: '1', 
            text: 'Translate the following sentence into your language: "The sun is shining brightly today."', 
            answer: 'Varies by language (e.g., Twi: Awia no rebɔ kɛseɛ nnɛ).' 
        }] 
    }] 
  },
  { 
    year: 2025, 
    subject: 'Creative Arts and Design', 
    sections: [{ 
        title: 'PAPER 2 - VISUAL ARTS', 
        instructions: 'Answer all questions.', 
        marks: 30, 
        questions: [{ 
            number: '1', 
            text: 'Define the term "Perspective" in drawing and mention two types.', 
            answer: 'Perspective is the art of drawing solid objects on a two-dimensional surface so as to give the right impression of their height, width, depth, and position in relation to each other. Types: 1-point perspective, 2-point perspective.' 
        }] 
    }] 
  },
];
