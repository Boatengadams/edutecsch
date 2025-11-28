

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
      <svg width="550" height="450" viewBox="0 0 550 450" xmlns="http://www.w3.org/2000/svg" style="background-color:white; border-radius:8px; padding:10px; border:1px solid #e2e8f0;">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#333" />
          </marker>
        </defs>
        
        <!-- Stage B (Top) -->
        <ellipse cx="275" cy="60" rx="60" ry="30" fill="#e0f2fe" stroke="#0284c7" stroke-width="2" />
        <text x="275" y="65" text-anchor="middle" font-weight="bold" font-size="16">B</text>

        <!-- Stage A (Left) -->
        <ellipse cx="100" cy="225" rx="50" ry="30" fill="#dcfce7" stroke="#166534" stroke-width="2" />
        <text x="100" y="230" text-anchor="middle" font-weight="bold" font-size="16">A</text>

        <!-- Stage C (Center) -->
        <ellipse cx="275" cy="225" rx="50" ry="30" fill="#fef3c7" stroke="#d97706" stroke-width="2" />
        <text x="275" y="230" text-anchor="middle" font-weight="bold" font-size="16">C</text>

        <!-- Stage D (Below C) -->
        <ellipse cx="275" cy="340" rx="50" ry="30" fill="#f3f4f6" stroke="#4b5563" stroke-width="2" />
        <text x="275" y="345" text-anchor="middle" font-weight="bold" font-size="16">D</text>

        <!-- Fossil Fuel (Bottom of D) -->
        <ellipse cx="275" cy="410" rx="40" ry="20" fill="#444" stroke="black" stroke-width="1" />
        <text x="275" y="415" text-anchor="middle" fill="white" font-size="12">Fossil fuel</text>

        <!-- Factories (Right) -->
        <ellipse cx="450" cy="225" rx="60" ry="35" fill="#cbd5e1" stroke="#334155" stroke-width="2" />
        <text x="450" y="220" text-anchor="middle" font-weight="bold" font-size="14">Factories/</text>
        <text x="450" y="240" text-anchor="middle" font-weight="bold" font-size="14">Industries</text>

        <!-- Arrows -->
        
        <!-- A -> B (Respiration - Unlabeled to avoid confusion with P) -->
        <path d="M120 190 Q 150 100 220 70" fill="none" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)" stroke-dasharray="5,5" />

        <!-- B -> A labeled P (Photosynthesis) - REPLACED A->C -->
        <path d="M215 60 Q 120 80 100 195" fill="none" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)" />
        <text x="130" y="130" font-weight="bold" font-size="16" fill="#333">P</text>

        <!-- C -> B labeled Q (Respiration) - REVERSED -->
        <path d="M275 195 L 275 90" fill="none" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)" />
        <text x="285" y="140" font-weight="bold" font-size="16" fill="#333">Q</text>
        <text x="340" y="140" text-anchor="middle" font-size="10" fill="#666" font-style="italic">(animal respiration)</text>

        <!-- C -> D (Death/Waste) - EXISTING -->
        <path d="M275 255 L 275 300" fill="none" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)" />

        <!-- A -> D labeled S (Death) - REVERSED -->
        <path d="M130 245 Q 160 320 225 340" fill="none" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)" />
        <text x="160" y="310" font-weight="bold" font-size="16" fill="#333">S</text>

        <!-- Factories -> B labeled T (Combustion) - REVERSED -->
        <path d="M450 190 Q 450 80 335 60" fill="none" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)" />
        <text x="400" y="110" font-weight="bold" font-size="16" fill="#333">T</text>

        <!-- Connector D to Fossil fuel -->
        <line x1="275" y1="370" x2="275" y2="390" stroke="#333" stroke-width="1" />
        
        <!-- Fossil Fuel -> Factories (Supply) - ADDED -->
        <path d="M315 410 Q 420 410 450 260" fill="none" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)" />

      </svg>
    </div>
  `,
  'is_2025_q1b_farming': `
    <div class="my-4 flex flex-col md:flex-row justify-center gap-10">
      <!-- System K -->
      <div class="flex flex-col items-center">
        <h4 class="font-bold mb-4 text-lg">System K (Shifting Cultivation)</h4>
        <svg width="250" height="250" viewBox="0 0 250 250" xmlns="http://www.w3.org/2000/svg" style="background-color:white; border-radius:8px; padding:10px; border:1px solid #e2e8f0;">
          <defs>
            <marker id="arrowK" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#166534" />
            </marker>
          </defs>
          
          <!-- Farmland A (Top Left) -->
          <rect x="20" y="20" width="80" height="60" fill="#dcfce7" stroke="#166534" />
          <text x="60" y="45" text-anchor="middle" font-weight="bold" font-size="12">Farmland A</text>
          <text x="60" y="65" text-anchor="middle" font-size="10">Year 1</text>

          <!-- Farmland B (Top Right) -->
          <rect x="150" y="20" width="80" height="60" fill="#dcfce7" stroke="#166534" />
          <text x="190" y="45" text-anchor="middle" font-weight="bold" font-size="12">Farmland B</text>
          <text x="190" y="65" text-anchor="middle" font-size="10">Year 4</text>

          <!-- Farmland C (Bottom Right) -->
          <rect x="150" y="150" width="80" height="60" fill="#dcfce7" stroke="#166534" />
          <text x="190" y="175" text-anchor="middle" font-weight="bold" font-size="12">Farmland C</text>
          <text x="190" y="195" text-anchor="middle" font-size="10">Year 7</text>

          <!-- Farmland D (Bottom Left) -->
          <rect x="20" y="150" width="80" height="60" fill="#dcfce7" stroke="#166534" />
          <text x="60" y="175" text-anchor="middle" font-weight="bold" font-size="12">Farmland D</text>
          <text x="60" y="195" text-anchor="middle" font-size="10">Year 10</text>

          <!-- Arrows -->
          <path d="M100 50 L140 50" stroke="#166534" stroke-width="2" marker-end="url(#arrowK)" />
          <path d="M190 80 L190 140" stroke="#166534" stroke-width="2" marker-end="url(#arrowK)" />
          <path d="M150 180 L110 180" stroke="#166534" stroke-width="2" marker-end="url(#arrowK)" />
          <path d="M60 150 L60 90" stroke="#166534" stroke-width="2" marker-end="url(#arrowK)" />
        </svg>
      </div>

      <!-- System L -->
      <div class="flex flex-col items-center">
        <h4 class="font-bold mb-4 text-lg">System L (Crop Rotation)</h4>
        <svg width="250" height="250" viewBox="0 0 250 250" xmlns="http://www.w3.org/2000/svg" style="background-color:white; border-radius:8px; padding:10px; border:1px solid #e2e8f0;">
           <defs>
            <marker id="arrowL" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#d97706" />
            </marker>
          </defs>
           <!-- Main Farmland Square -->
           <rect x="25" y="25" width="200" height="200" fill="none" stroke="#333" stroke-width="3" />
           
           <!-- Dividers -->
           <line x1="125" y1="25" x2="125" y2="225" stroke="#333" stroke-width="2" />
           <line x1="25" y1="125" x2="225" y2="125" stroke="#333" stroke-width="2" />

           <!-- Plot Labels -->
           <text x="75" y="75" text-anchor="middle" font-weight="bold" font-size="14">Plot 1</text>
           <text x="175" y="75" text-anchor="middle" font-weight="bold" font-size="14">Plot 2</text>
           <text x="175" y="175" text-anchor="middle" font-weight="bold" font-size="14">Plot 3</text>
           <text x="75" y="175" text-anchor="middle" font-weight="bold" font-size="14">Plot 4</text>

           <!-- Circular Flow Arrows in Center -->
           <path d="M90 60 Q 125 40 160 60" fill="none" stroke="#d97706" stroke-width="3" marker-end="url(#arrowL)" />
           <path d="M190 90 Q 210 125 190 160" fill="none" stroke="#d97706" stroke-width="3" marker-end="url(#arrowL)" />
           <path d="M160 190 Q 125 210 90 190" fill="none" stroke="#d97706" stroke-width="3" marker-end="url(#arrowL)" />
           <path d="M60 160 Q 40 125 60 90" fill="none" stroke="#d97706" stroke-width="3" marker-end="url(#arrowL)" />
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
    <div class="my-4 flex flex-col md:flex-row justify-center items-end gap-10">
      <!-- Setup A: Distillation -->
      <div class="flex flex-col items-center">
        <h4 class="font-bold mb-2 text-lg">A</h4>
        <svg width="350" height="300" viewBox="0 0 350 300" xmlns="http://www.w3.org/2000/svg" style="background-color:white; border-radius:8px; padding:10px; border:1px solid #e2e8f0;">
           <defs>
             <marker id="arrow" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto">
               <path d="M0,0 L0,6 L6,3 z" fill="#000" />
             </marker>
           </defs>
           <!-- Flame -->
           <path d="M50 270 Q 60 220 70 270" fill="#f97316" stroke="#ef4444" />
           <rect x="40" y="270" width="40" height="10" fill="#333" />
           
           <!-- Flask (IV) -->
           <circle cx="60" cy="190" r="40" fill="none" stroke="black" stroke-width="2" />
           <rect x="50" y="130" width="20" height="40" fill="none" stroke="black" stroke-width="2" />
           <!-- Water in flask -->
           <path d="M25 200 Q 60 210 95 200 A 40 40 0 0 0 25 200" fill="#bae6fd" opacity="0.5" />
           <text x="30" y="180" font-weight="bold">IV</text>

           <!-- Delivery Tube (V) -->
           <path d="M60 130 L60 110 L130 130" fill="none" stroke="black" stroke-width="2" />
           <text x="90" y="115" font-weight="bold">V</text>

           <!-- Condenser (II) Outer Jacket -->
           <g transform="translate(130, 130) rotate(20)">
             <rect x="0" y="-15" width="120" height="30" fill="#f1f5f9" stroke="black" stroke-width="2" />
             <!-- Inner tube -->
             <line x1="0" y1="0" x2="120" y2="0" stroke="black" stroke-width="2" stroke-dasharray="4" />
             <!-- Water Out (Top) -->
             <line x1="100" y="-15" x2="100" y2="-25" stroke="black" stroke-width="2" />
             <text x="100" y="-30" font-size="10" text-anchor="middle">Water out</text>
             <!-- Water In (Bottom) -->
             <line x1="20" y1="15" x2="20" y2="25" stroke="black" stroke-width="2" />
             <text x="20" y="35" font-size="10" text-anchor="middle">Water in</text>
           </g>
           <text x="180" y="120" font-weight="bold">II</text>

           <!-- Connector to Receiver -->
           <path d="M242 172 L250 180" fill="none" stroke="black" stroke-width="2" />

           <!-- Receiver Flask (III) -->
           <path d="M240 270 L280 270 L270 200 L250 200 Z" fill="none" stroke="black" stroke-width="2" />
           <text x="290" y="240" font-weight="bold">III</text>
           
           <!-- Droplets "Water out" (Distillate) -->
           <circle cx="260" cy="210" r="2" fill="#3b82f6" />
           <circle cx="260" cy="220" r="2" fill="#3b82f6" />
           <text x="300" y="210" font-size="10">Distillate</text>
        </svg>
      </div>

      <!-- Setup B: Capillarity -->
      <div class="flex flex-col items-center">
        <h4 class="font-bold mb-2 text-lg">B</h4>
        <svg width="200" height="300" viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" style="background-color:white; border-radius:8px; padding:10px; border:1px solid #e2e8f0;">
           <!-- Curved Tube (VI) -->
           <path d="M40 50 Q 120 50 120 150 V 220" fill="none" stroke="#64748b" stroke-width="12" stroke-linecap="round" />
           <path d="M40 50 Q 120 50 120 150 V 220" fill="none" stroke="#94a3b8" stroke-width="6" stroke-linecap="round" />
           <text x="80" y="40" font-weight="bold">VI</text>

           <!-- Basin (VII) -->
           <rect x="60" y="220" width="120" height="60" fill="#fca5a5" stroke="black" />
           <!-- Granular Material -->
           <circle cx="80" cy="240" r="2" fill="#7f1d1d" />
           <circle cx="100" cy="250" r="2" fill="#7f1d1d" />
           <circle cx="130" cy="245" r="2" fill="#7f1d1d" />
           <circle cx="90" cy="270" r="2" fill="#7f1d1d" />
           <text x="190" y="240" font-weight="bold">VII</text>
           
           <!-- Water movement -->
           <path d="M120 220 L120 250" stroke="#3b82f6" stroke-width="2" stroke-dasharray="2" />
           <text x="150" y="270" font-size="10" fill="#3b82f6">Water</text>
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
  'math_2025_q5a_pie': `
    <div class="my-4 flex justify-center">
        <svg width="300" height="300" viewBox="0 0 300 300" style="background-color:white; border-radius:50%; border:1px solid #cbd5e1;">
            <!-- Segments -->
            <!-- Rice: 108 deg. Start 0. End 108 -->
            <path d="M150,150 L150,0 A150,150 0 0,1 292.6,196.4 Z" fill="#e0f2fe" stroke="black" stroke-width="1"/>
            <text x="200" y="80" font-size="12" font-weight="bold">Rice</text>
            <text x="200" y="100" font-size="12">108°</text>
            
            <!-- Sugar: 36 deg. Start 108. End 144 -->
            <path d="M150,150 L292.6,196.4 A150,150 0 0,1 238.2,272.7 Z" fill="#fef3c7" stroke="black" stroke-width="1"/>
            <text x="240" y="210" font-size="12" font-weight="bold">Sugar</text>
            <text x="250" y="230" font-size="12">36°</text>
            
            <!-- Fish: 72 deg. Start 144. End 216 -->
            <path d="M150,150 L238.2,272.7 A150,150 0 0,1 61.8,272.7 Z" fill="#dcfce7" stroke="black" stroke-width="1"/>
            <text x="140" y="250" font-size="12" font-weight="bold">Fish</text>
            
            <!-- Gari: 90 deg. Start 216. End 306 -->
            <path d="M150,150 L61.8,272.7 A150,150 0 0,1 28.6,61.8 Z" fill="#fee2e2" stroke="black" stroke-width="1"/>
            <text x="60" y="180" font-size="12" font-weight="bold">Gari</text>
            <rect x="135" y="150" width="15" height="15" fill="none" stroke="black" transform="rotate(-36 150 150)"/>
            
            <!-- Flour: 54 deg. Start 306. End 360 -->
            <path d="M150,150 L28.6,61.8 A150,150 0 0,1 150,0 Z" fill="#f3f4f6" stroke="black" stroke-width="1"/>
            <text x="90" y="60" font-size="12" font-weight="bold">Flour</text>
            <text x="110" y="80" font-size="12">54°</text>
        </svg>
    </div>
  `,
  'math_2025_q6_graph': `
    <div class="my-4 flex justify-center">
        <svg width="400" height="300" viewBox="-40 -20 400 320" style="background-color:white; border-radius:8px; padding:10px; border:1px solid #e2e8f0;">
            <!-- Grid -->
            <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" stroke-width="1"/>
                </pattern>
            </defs>
            <rect width="320" height="280" fill="url(#grid)" />
            
            <!-- Axes -->
            <line x1="0" y1="280" x2="320" y2="280" stroke="black" stroke-width="2"/> <!-- X -->
            <line x1="0" y1="0" x2="0" y2="280" stroke="black" stroke-width="2"/> <!-- Y -->
            
            <!-- Labels -->
            <text x="160" y="310" text-anchor="middle" font-size="12">Time (in minutes)</text>
            <text x="-15" y="140" text-anchor="middle" font-size="12" transform="rotate(-90 -15 140)">Distance (in km)</text>
            
            <!-- Ticks X (0, 20, 40... 200) scale: 1 unit = 20/20 = 1px? No. Scale provided: 2cm to 20 mins. Let 40px = 20 mins -->
            <!-- 0, 40, 80, 120, 160, 200, 240, 280, 320 px -->
            <!-- 0, 20, 40, 60,  80,  100, 120, 140, 160 mins -->
            <text x="0" y="295" font-size="10">0</text>
            <text x="40" y="295" font-size="10">20</text>
            <text x="80" y="295" font-size="10">40</text>
            <text x="120" y="295" font-size="10">60</text>
            <text x="160" y="295" font-size="10">80</text>
            <text x="200" y="295" font-size="10">100</text>
            <text x="240" y="295" font-size="10">120</text>
            <text x="280" y="295" font-size="10">140</text>
            <text x="320" y="295" font-size="10">160</text>
            
            <!-- Ticks Y (0, 5, 10... 45) scale: 2cm to 5km. Let 40px = 5km -->
            <!-- 280 (0), 240 (5), 200 (10), 160 (15), 120 (20), 80 (25), 40 (30), 0 (35)? No map height. -->
            <!-- Height 280. 7 steps of 40px. 0, 5, 10, 15, 20, 25, 30, 35. -->
            <text x="-10" y="280" font-size="10">0</text>
            <text x="-10" y="240" font-size="10">5</text>
            <text x="-10" y="200" font-size="10">10</text>
            <text x="-10" y="160" font-size="10">15</text>
            <text x="-10" y="120" font-size="10">20</text>
            <text x="-10" y="80" font-size="10">25</text>
            <text x="-10" y="40" font-size="10">30</text>
            <text x="-10" y="0" font-size="10">35</text>
            
            <!-- Plot -->
            <!-- Kadumgu (0,0) -->
            <!-- Cooltown (60 mins, 10km) -> (120px, 200px) -->
            <!-- Rest 30 mins (60-90) -> (120px to 180px, 200px) -->
            <!-- Reached Datanu 60 mins later (90+60=150 mins) -> (300px). Distance 40km. (300px, -40px?? Graph cuts off at 35) -->
            <!-- Adjust scale slightly: max Y is 45km. -->
            
            <circle cx="0" cy="280" r="3" fill="black" />
            <text x="5" y="275" font-size="10" font-weight="bold">Kadumgu</text>
            
            <circle cx="120" cy="200" r="3" fill="black" />
            <text x="110" y="190" font-size="10" font-weight="bold">Cooltown</text>
            
            <line x1="0" y1="280" x2="120" y2="200" stroke="black" stroke-width="2" />
            <line x1="120" y1="200" x2="180" y2="200" stroke="black" stroke-width="2" /> <!-- Rest -->
            
            <circle cx="300" cy="-40" r="3" fill="black" /> <!-- Virtual point off screen based on scale above -->
            <!-- Drawing line going up steeply -->
            <line x1="180" y1="200" x2="300" y2="-40" stroke="black" stroke-width="2" />
            <text x="280" y="20" font-size="10" font-weight="bold">Datanu</text>
        </svg>
    </div>
  `,
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
            instructions: 'Answer all questions. Each question is followed by four options lettered A to D. Find the correct option for each question.',
            marks: 40,
            questions: [
                { number: '1', text: 'Germs that infect the respiratory system are frequently spread through<br>I. mucus<br>II. air pollution<br>III. coughs', options: [{key:'A', text:'I only'}, {key:'B', text:'II only'}, {key:'C', text:'II and III only'}, {key:'D', text:'I, II and III'}], answer: 'D' },
                { number: '2', text: 'Which of the following food substances would produce a red precipitate when heated with Millon\'s reagent?', options: [{key:'A', text:'Banana'}, {key:'B', text:'Groundnut'}, {key:'C', text:'Orange juice'}, {key:'D', text:'Pineapple juice'}], answer: 'B' },
                { number: '3', text: 'An organism that lives on decaying organic matter, contaminates human food, feeds on rotten fruits and transfers germs is most likely a', options: [{key:'A', text:'fungus'}, {key:'B', text:'grasshopper'}, {key:'C', text:'housefly'}, {key:'D', text:'mosquito'}], answer: 'C' },
                { number: '4', text: 'A fruit with sour taste is most likely to have a pH that is', options: [{key:'A', text:'less than 7'}, {key:'B', text:'greater than 7'}, {key:'C', text:'equal to 14'}, {key:'D', text:'equal to 7'}], answer: 'A' },
                { number: '5', text: 'Which of the following energy sources is/are environmentally friendly?<br>I. Wind<br>II. Hydro<br>III. Biomass', options: [{key:'A', text:'I only'}, {key:'B', text:'II only'}, {key:'C', text:'I and II only'}, {key:'D', text:'I, II and III'}], answer: 'C' },
                { number: '6', text: 'Which of the following activities does not relate to the principles of pressure in the daily lives of humans?', options: [{key:'A', text:'Drinking straw in use by the people at a party'}, {key:'B', text:'Pumping air into car tyres'}, {key:'C', text:'Filling of balloons with air'}, {key:'D', text:'A person jerking forward when a speeding car suddenly stops'}], answer: 'D' },
                { number: '7', text: 'The rise in heat waves and floods globally may be due to the effect of', options: [{key:'A', text:'climate change'}, {key:'B', text:'greenhouse gases'}, {key:'C', text:'increased drought'}, {key:'D', text:'severe storms'}], answer: 'A' },
                { number: '8', text: 'The following soil qualities are important for crop production except', options: [{key:'A', text:'high salinity'}, {key:'B', text:'nutrient availability'}, {key:'C', text:'oxygen availability'}, {key:'D', text:'water-holding capacity'}], answer: 'A' },
                { number: '9', text: 'A rod appears bent when immersed in water. Which property of light is demonstrated?', options: [{key:'A', text:'Refraction'}, {key:'B', text:'Reflection'}, {key:'C', text:'Dispersion'}, {key:'D', text:'Rectilinear propagation'}], answer: 'A' },
                { number: '10', text: 'The following factors hinder vegetable production in Ghana except?', options: [{key:'A', text:'high cost of agricultural chemicals'}, {key:'B', text:'lack of market for farm produce'}, {key:'C', text:'irregular rainfall pattern'}, {key:'D', text:'availability of sunlight'}], answer: 'D' },
                { number: '11', text: 'Which of the following types of manure is suitable for a vegetable garden?', options: [{key:'A', text:'Cow dung'}, {key:'B', text:'Dog faecal waste'}, {key:'C', text:'Human excreta'}, {key:'D', text:'Pig dung'}], answer: 'A' },
                { number: '12', text: 'An example of a mono-gastric animal is', options: [{key:'A', text:'cattle'}, {key:'B', text:'goat'}, {key:'C', text:'sheep'}, {key:'D', text:'rabbit'}], answer: 'D' },
                { number: '13', text: 'Which of the following insect(s) show(s) the egg, nymph and adult stages in its life cycle?<br>I. Grasshopper<br>II. Housefly<br>III. Mosquito', options: [{key:'A', text:'I only'}, {key:'B', text:'I and III only'}, {key:'C', text:'II and III only'}, {key:'D', text:'I, II and III'}], answer: 'A' },
                { number: '14', text: 'Which of the following statements best explains the term ecosystem? It is', options: [{key:'A', text:'a group of organisms of the same species that live in the same place at the same time.'}, {key:'B', text:'a group of populations living in the same area at the same time.'}, {key:'C', text:'the part of the earth\'s environment where life exists.'}, {key:'D', text:'a community of living and non-living things interacting with each other.'}], answer: 'D' },
                { number: '15', text: 'The characteristics of a fertile soil include good<br>I. aeration<br>II. texture<br>III. water-holding capacity', options: [{key:'A', text:'I only'}, {key:'B', text:'I and II only'}, {key:'C', text:'II and III only'}, {key:'D', text:'I, II and III'}], answer: 'D' },
                { number: '16', text: 'Which of the following diseases can be classified as a viral disease?', options: [{key:'A', text:'Candidiasis'}, {key:'B', text:'H1N1'}, {key:'C', text:'Meningitis'}, {key:'D', text:'Ringworm'}], answer: 'B' },
                { number: '17', text: 'The chemical formula of iron (II) sulphide is', options: [{key:'A', text:'FeS₂'}, {key:'B', text:'Fe₂S'}, {key:'C', text:'FeS'}, {key:'D', text:'Fe₂S₃'}], answer: 'C' },
                { number: '18', text: 'A book is at rest on a table. The net force acting on the book could be described as one that', options: [{key:'A', text:'is balanced'}, {key:'B', text:'is unbalanced'}, {key:'C', text:'is due to friction'}, {key:'D', text:'obeys Newton\'s second law'}], answer: 'A' },
                { number: '19', text: 'Which of the following Ghanaian scientists is known for promoting Mathematics and Physics?', options: [{key:'A', text:'Prof. Anamuah Mensah'}, {key:'B', text:'Prof. Ewurama Addy'}, {key:'C', text:'Prof. Francis Allotey'}, {key:'D', text:'Prof. Osei Anto'}], answer: 'C' },
                { number: '20', text: 'Which of the following heart conditions in humans is caused by plaque deposits in the arteries?', options: [{key:'A', text:'Atherosclerosis'}, {key:'B', text:'Heart attack'}, {key:'C', text:'Heart failure'}, {key:'D', text:'Stroke'}], answer: 'A' },
                { number: '21', text: 'A mango of mass 2 kg hangs 15 m on top of a mango tree. Determine the value of the kinetic energy attained just before it hits the ground. [g=10 m s⁻²]', options: [{key:'A', text:'30.0 J'}, {key:'B', text:'225.0 J'}, {key:'C', text:'300.0 J'}, {key:'D', text:'3.0 J'}], answer: 'C' },
                { number: '22', text: 'A grassland ecosystem that consists of snakes, toads and grasshoppers is most likely to produce a food chain of', options: [{key:'A', text:'toad → grass → grasshopper → snake'}, {key:'B', text:'grass → grasshopper → toad → snake'}, {key:'C', text:'grasshopper → grass → toad → snake'}, {key:'D', text:'grass → toad → grasshopper → snake'}], answer: 'B' },
                { number: '23', text: 'The first step in the digestion of fats in the body is that', options: [{key:'A', text:'bile breaks down the fat in the gall bladder.'}, {key:'B', text:'bile breaks down the fat in the duodenum.'}, {key:'C', text:'lipase breaks down the fat in the pancreas.'}, {key:'D', text:'lipase breaks down the fat in the ileum.'}], answer: 'B' },
                { number: '24', text: 'Which of the following waste disposal practices is best for plastic disposal?', options: [{key:'A', text:'Burning'}, {key:'B', text:'Composting'}, {key:'C', text:'Incineration'}, {key:'D', text:'Recycling'}], answer: 'D' },
                { number: '25', text: 'A patient has been diagnosed of hypertension. Which of the following readings is most likely the patient\'s blood pressure?', options: [{key:'A', text:'110/85'}, {key:'B', text:'120/80'}, {key:'C', text:'130/85'}, {key:'D', text:'140/90'}], answer: 'D' },
                { number: '26', text: 'Which of the following substances are major components of human blood?<br>I. Hormones<br>II. Platelets<br>III. Plasma<br>IV. White blood cells', options: [{key:'A', text:'I and II only'}, {key:'B', text:'II and III only'}, {key:'C', text:'III and IV only'}, {key:'D', text:'II, III and IV only'}], answer: 'D' },
                { number: '27', text: 'Which of the following organisms is prokaryotic?', options: [{key:'A', text:'Bacteria'}, {key:'B', text:'Earthworm'}, {key:'C', text:'Fungus'}, {key:'D', text:'Plant'}], answer: 'A' },
            ]
        },
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
                                { number: '(i)', text: 'Name the stages labelled A, B, C and D.', answer: '<ul><li><strong>A:</strong> Plants</li><li><strong>B:</strong> Carbon dioxide in the atmosphere</li><li><strong>C:</strong> Animals</li><li><strong>D:</strong> Dead/decaying organisms/organic matter</li></ul>' },
                                { number: '(ii)', text: 'Name the processes labelled P, S and T.', answer: '<ul><li><strong>P:</strong> Photosynthesis</li><li><strong>S:</strong> Decay/decomposition</li><li><strong>T:</strong> Combustion/burning</li></ul>' },
                                { number: '(iii)', text: 'State three human activities that result in the increase of Carbon dioxide in the atmosphere.', answer: '<ul><li>Raising of livestock</li><li>Growing of crops</li><li>Burning of wood</li><li>Burning of fossil fuels/coal/industrial pollution</li><li>Reducing amount of forest cover/deforestation</li></ul>' }
                            ]
                        },
                        {
                            number: '(b)',
                            text: 'The diagrams below labeled K and L illustrate two different farming systems. Study them carefully and answer the questions that follow.',
                            diagramId: 'is_2025_q1b_farming',
                            answer: '',
                            sub_parts: [
                                { number: '(i)', text: 'Identify the farming systems labelled K and L.', answer: '<ul><li><strong>K:</strong> Land rotation</li><li><strong>L:</strong> Crop rotation</li></ul>' },
                                { number: '(ii)', text: 'State the main difference in the movement of the farmer in system K compared to system L.', answer: '<ul><li><strong>K:</strong> The farmer moves from one farmland to another.</li><li><strong>L:</strong> The farmer moves/rotates the crops from one plot to another.</li></ul>' },
                                { number: '(iii)', text: 'State two advantages of system L over system K.', answer: '<ul><li>The soil regains its fertility / prevents soil exhaustion.</li><li>There is control in the build-up of pests and diseases.</li><li>It helps to maintain good yield.</li><li>It saves money.</li></ul>' },
                                { number: '(iv)', text: 'State three disadvantages of system K.', answer: '<ul><li>Time, energy and money is wasted in clearing new land each time land is abandoned.</li><li>System does not encourage large scale farming.</li><li>There is rampant deforestation.</li><li>Cultivated lands are generally small and scattered.</li><li>Land is getting scarce / a growing population.</li></ul>' },
                                { number: '(v)', text: 'Name the type of crop usually included in system L to improve soil fertility.', answer: 'Leguminous crops' }
                            ]
                        },
                        {
                            number: '(c)',
                            text: 'Figure 1(c) is an illustration of a mason pulling a slab by means of a rope up an inclined plane. The labels I, II and III represent forces acting on the slab.<br>Study the figure carefully and answer the questions that follow.',
                            diagramId: 'is_2025_q1c_inclined_plane',
                            answer: '',
                            sub_parts: [
                                { number: '(i)', text: 'Give three examples of the use of inclined planes in everyday life.', answer: '<ul><li>Stair case</li><li>Ladder</li><li>Plank of wood at an angle</li><li>Hill</li><li>Ramps</li><li>Screws</li></ul>' },
                                { number: '(ii)', text: 'Given that I is 400 N and moves a distance of 10 m whiles II is 100 N and moves a distance of 5 m, calculate the:<br>(α) work output;<br>(β) work input;<br>(γ) efficiency.', answer: '<p><strong>(α) Work Output</strong><br>Formula: L x Ld<br>Calculation: 100 x 5<br>Answer: <strong>500 J</strong></p><p><strong>(β) Work Input</strong><br>Formula: E x Ed<br>Calculation: 400 x 10<br>Answer: <strong>4000 J</strong></p><p><strong>(γ) Efficiency</strong><br>Formula: (Work output / Work input) x 100%<br>Calculation: (500 / 4000) x 100%<br>Answer: <strong>12.5%</strong></p>' }
                            ]
                        },
                        {
                            number: '(d)',
                            text: 'Figure 1(d) contains two separate experimental set-ups, labeled A and B. Study the figure carefully and answer the questions that follow.',
                            diagramId: 'is_2025_q1d_experiments',
                            answer: '',
                            sub_parts: [
                                { number: '(i)', text: 'Name the scientific principle being demonstrated in A and B.', answer: '<strong>A:</strong> Distillation<br><strong>B:</strong> Capillarity / Water movement through porous material' },
                                { number: '(ii)', text: 'Describe briefly the functions of each of the parts labelled II and VI.', answer: '<ul><li><strong>II (Condenser):</strong> Cools the vapour back to liquid state.</li><li><strong>VI (Curved Tube/Siphon):</strong> Delivers water to the granular material.</li></ul>' },
                                { number: '(iii)', text: 'Name any two types of materials that could be found in:<br>(α) III;<br>(β) VII.', answer: '<p><strong>(α) III (Receiver):</strong> Distillate / Condensed water / Ethanol.</p><p><strong>(β) VII (Granular Material):</strong> Dry soil / Sand / Sawdust.</p>' },
                                { number: '(iv)', text: 'Give the reason why the direction of water flow in A must not be reversed.', answer: 'To ensure the cooling jacket (condenser) is always completely filled with water for effective condensation/cooling.' }
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
            instructions: 'Answer all questions. Choose the correct option that completes the sentence or answers the question.',
            marks: 40,
            questions: [
                { number: '1', text: 'Roberta, Rukiya et Cobbina cherchent ......<br><em>(Contexte: Sur un site d\'amitié en ligne)</em>', options: [{key:'A', text:'des amis'}, {key:'B', text:'des camarades'}, {key:'C', text:'des collégiens'}, {key:'D', text:'des élèves'}], answer: 'A' },
                { number: '2', text: 'Selon les textes, qui n\'aime pas préparer les repas? <em>(Roberta dit: "...je déteste cuisiner")</em>', options: [{key:'A', text:'Cobbina'}, {key:'B', text:'D-Jay'}, {key:'C', text:'Roberta'}, {key:'D', text:'Rukiya'}], answer: 'C' },
                { number: '3', text: 'Rukiya aime ......', options: [{key:'A', text:'l\'anglais'}, {key:'B', text:'le français'}, {key:'C', text:'l\'histoire'}, {key:'D', text:'les mathématiques'}], answer: 'D' },
                { number: '4', text: 'Rukiya est ...... du groupe de trois élèves. <em>(Âges: Roberta 12, Rukiya 15, Cobbina 7)</em>', options: [{key:'A', text:'la plus âgée'}, {key:'B', text:'la plus belle'}, {key:'C', text:'la plus jeune'}, {key:'D', text:'la plus petite'}], answer: 'A' },
                { number: '5', text: 'Selon le passage, Cobbina adore ...... <em>("J\'aime beaucoup les animaux")</em>', options: [{key:'A', text:'les chats'}, {key:'B', text:'l\'anglais'}, {key:'C', text:'aller à Tarkwa'}, {key:'D', text:'manger de la viande'}], answer: 'A' },
                { number: '6', text: 'Qu\'est-ce qui anime le vendredi soir à Domekofe?', options: [{key:'A', text:'La journée au champ'}, {key:'B', text:'Le retour des élèves'}, {key:'C', text:'Les devoirs'}, {key:'D', text:'Les jouissances'}], answer: 'D' },
                { number: '7', text: 'Selon le journaliste, les parents à Domekofe sont ......', options: [{key:'A', text:'animateurs'}, {key:'B', text:'cultivateurs'}, {key:'C', text:'élèves'}, {key:'D', text:'musiciens'}], answer: 'B' },
                { number: '8', text: 'D\'après le texte, on joue du tam-tam ......', options: [{key:'A', text:'à la place publique'}, {key:'B', text:'à l\'école publique'}, {key:'C', text:'au champ'}, {key:'D', text:'au foyer'}], answer: 'A' },
                { number: '9', text: 'Pendant la soirée, les jeunes dansent ...... leurs parents.', options: [{key:'A', text:'avec'}, {key:'B', text:'comme'}, {key:'C', text:'pour'}, {key:'D', text:'sans'}], answer: 'B' },
                { number: '10', text: 'À 22 heures, tout le monde va ......', options: [{key:'A', text:'chanter'}, {key:'B', text:'danser'}, {key:'C', text:'se coucher'}, {key:'D', text:'s\'amuser'}], answer: 'C' },
                { number: '11', text: 'La famille Boateng a ...... membres.', options: [{key:'A', text:'deux'}, {key:'B', text:'trois'}, {key:'C', text:'cinq'}, {key:'D', text:'six'}], answer: 'D' },
                { number: '12', text: 'Kwaku est ...... de M. Boateng.', options: [{key:'A', text:'l\'enfant'}, {key:'B', text:'l\'oncle'}, {key:'C', text:'le cousin'}, {key:'D', text:'le neveu'}], answer: 'D' },
                { number: '13', text: 'Patrick et Patricia sont nés le même jour, c\'est-à-dire qu\'ils sont ......', options: [{key:'A', text:'des confrères'}, {key:'B', text:'des frères'}, {key:'C', text:'des jumeaux'}, {key:'D', text:'des soeurs'}], answer: 'C' },
                { number: '14', text: 'Philip a quel âge?', options: [{key:'A', text:'2 ans'}, {key:'B', text:'8 ans'}, {key:'C', text:'10 ans'}, {key:'D', text:'12 ans'}], answer: 'B' },
                { number: '15', text: 'Le petit déjeuner est préparé par ......', options: [{key:'A', text:'Patrick et Patricia'}, {key:'B', text:'Philip et Kwaku'}, {key:'C', text:'Philip et Mme Boateng'}, {key:'D', text:'Patricia et Mme Boateng'}], answer: 'D' },
                { number: '16', text: 'Barracks Basic et Airport Basic sont ......', options: [{key:'A', text:'des camps militaires'}, {key:'B', text:'des écoles primaires'}, {key:'C', text:'des équipes de football'}, {key:'D', text:'des joueurs de football'}], answer: 'B' },
                { number: '17', text: 'Le match a lieu ......', options: [{key:'A', text:'à Barracks Basic'}, {key:'B', text:'à Airport Basic'}, {key:'C', text:'au ministère des Sports'}, {key:'D', text:'sur le terrain du Ghana'}], answer: 'A' },
                { number: '18', text: 'Combien de buts sont marqués pendant le match?', options: [{key:'A', text:'Zéro'}, {key:'B', text:'Deux'}, {key:'C', text:'Trois'}, {key:'D', text:'Cinq'}], answer: 'C' },
                { number: '19', text: 'Selon le passage, ......', options: [{key:'A', text:'Airport Basic perd le match'}, {key:'B', text:'Appiah marque trois buts'}, {key:'C', text:'l\'arbitre siffle deux pénaltys'}, {key:'D', text:'Shittu rate trois pénaltys'}], answer: 'C' },
                { number: '20', text: 'Le gardien de Airport Basic rate un pénalty à la ...... minute.', options: [{key:'A', text:'29 ème'}, {key:'B', text:'49 ème'}, {key:'C', text:'89 ème'}, {key:'D', text:'99 ème'}], answer: 'C' },
                { number: '21', text: 'Quand on parle d\'Afadzato, il s\'agit ......', options: [{key:'A', text:'d\'un animal'}, {key:'B', text:'d\'une montagne'}, {key:'C', text:'d\'un pays'}, {key:'D', text:'d\'une ville'}], answer: 'B' },
                { number: '22', text: 'À la fin de la journée, quand Aminata veut aller au lit, elle dit "......" à sa mère.', options: [{key:'A', text:'Au lit!'}, {key:'B', text:'Au revoir!'}, {key:'C', text:'Bonne nuit!'}, {key:'D', text:'Bonsoir!'}], answer: 'C' },
                { number: '23', text: '— Joe! Tu es le dernier né de tes parents?<br>— Ah non! Je suis plutôt ......', options: [{key:'A', text:'l\'aîné'}, {key:'B', text:'le cadet'}, {key:'C', text:'l\'enfant'}, {key:'D', text:'le petit'}], answer: 'A' },
                { number: '24', text: '— Salut Sammy! Je t\'invite à jouer aux jeux vidéo. Tu viens?<br>— ...... Je suis occupé.', options: [{key:'A', text:'D\'accord!'}, {key:'B', text:'Désolé!'}, {key:'C', text:'Ok, ça marche!'}, {key:'D', text:'Oui, merci!'}], answer: 'B' },
                { number: '25', text: '— Bonjour. Maman! Où allez-vous?<br>— Bonjour! Je veux aller voir le directeur de l\'école dans ...... pour payer les frais de scolarité.', options: [{key:'A', text:'son atelier'}, {key:'B', text:'son bureau'}, {key:'C', text:'sa classe'}, {key:'D', text:'sa salle'}], answer: 'B' },
                { number: '26', text: 'M. Dupont est européen ...... son teint noir.', options: [{key:'A', text:'à part'}, {key:'B', text:'dans'}, {key:'C', text:'en plus'}, {key:'D', text:'malgré'}], answer: 'D' },
                { number: '27', text: 'Avec l\'ordonnance, Mme Awula va ...... pour acheter des médicaments.', options: [{key:'A', text:'à la clinique'}, {key:'B', text:'à la pharmacie'}, {key:'C', text:'au magasin'}, {key:'D', text:'au marché'}], answer: 'B' },
                { number: '28', text: '— Paul, voici mon cousin, Jean.<br>— Ah bon! Donc, il est ......', options: [{key:'A', text:'le fils de ta soeur'}, {key:'B', text:'le fils de ta tante'}, {key:'C', text:'le frère de ton père'}, {key:'D', text:'le frère de ton neveu'}], answer: 'B' },
                { number: '29', text: 'Mes chers enfants, c\'est bientôt décembre et nous devons nous préparer pour la fête ......', options: [{key:'A', text:'des Mères'}, {key:'B', text:'de Noël'}, {key:'C', text:'des Pâques'}, {key:'D', text:'de Pentecôte'}], answer: 'B' },
                { number: '30', text: '— Esi, que penses-tu des citoyens de ......?<br>— Ils sont vraiment gentils.', options: [{key:'A', text:'cette école'}, {key:'B', text:'cette région'}, {key:'C', text:'ce pays'}, {key:'D', text:'ce quartier'}], answer: 'C' },
                { number: '31', text: 'Le dernier samedi ...... mois d\'août marque le jour de la fête...', options: [{key:'A', text:'de'}, {key:'B', text:'au'}, {key:'C', text:'du'}, {key:'D', text:'le'}], answer: 'C' },
                { number: '32', text: '...tout le monde ...... de bonne heure...', options: [{key:'A', text:'se lève'}, {key:'B', text:'se lèves'}, {key:'C', text:'se lèvent'}, {key:'D', text:'se lever'}], answer: 'A' },
                { number: '33', text: '...très ......', options: [{key:'A', text:'content'}, {key:'B', text:'contente'}, {key:'C', text:'contents'}, {key:'D', text:'contentes'}], answer: 'A' },
                { number: '34', text: 'Personne ne va au champ ...... au travail ce jour-là.', options: [{key:'A', text:'ou'}, {key:'B', text:'ni'}, {key:'C', text:'tues'}, {key:'D', text:'pas'}], answer: 'B' },
                { number: '35', text: 'Le matin, les hommes ...... des moutons...', options: [{key:'A', text:'tue'}, {key:'B', text:'tuer'}, {key:'C', text:'tues'}, {key:'D', text:'tuent'}], answer: 'D' },
                { number: '36', text: '...c\'est le repas préféré dans ...... maison.', options: [{key:'A', text:'cette'}, {key:'B', text:'chaque'}, {key:'C', text:'ses'}, {key:'D', text:'d\'autres'}], answer: 'B' },
                { number: '37', text: '...chacun porte ...... jolis vêtements...', options: [{key:'A', text:'leurs'}, {key:'B', text:'ses'}, {key:'C', text:'elles'}, {key:'D', text:'il'}], answer: 'B' },
                { number: '38', text: '... et bijoux ...... se rassemblent à la place publique...', options: [{key:'A', text:'Elle'}, {key:'B', text:'Elles'}, {key:'C', text:'Il'}, {key:'D', text:'Ils'}], answer: 'D' },
                { number: '39', text: '...place publique ...... le grand arbre...', options: [{key:'A', text:'dans'}, {key:'B', text:'près'}, {key:'C', text:'sous'}, {key:'D', text:'nous'}], answer: 'C' },
                { number: '40', text: 'Le soir, ils rentrent chez ...... tout fatigués.', options: [{key:'A', text:'elles'}, {key:'B', text:'eux'}, {key:'C', text:'nous'}, {key:'D', text:'vous'}], answer: 'B' }
            ]
        },
        {
            title: 'PAPER 2 - ESSAY (THEORY)',
            instructions: 'Answer both questions in this section.',
            marks: 60,
            questions: [
                {
                    number: '1',
                    text: 'Les personnes suivantes parlent de ce qu\'elles font dans la vie. Identifiez leur métier ou leur profession. [20 marks]<br><br>(a) Je travaille pour un journal. Je suis ......<br>(b) Je m\'occupe des personnes malades. Je suis ......<br>(c) Je fais du pain et des gâteaux. Je suis ......<br>(d) Je juge les criminels. Je suis ......<br>(e) Je fabrique des meubles. Je suis ......<br>(f) J\'écris des lettres et je prends des messages. Je suis ......<br>(g) Je donne des cours d\'anglais. Je suis ......<br>(h) Je fais des chaussures. Je suis ......<br>(i) Je cuisine dans un restaurant. Je suis ......<br>(j) Je coupe les cheveux. Je suis ......',
                    answer: '<ul><li>(a) Journaliste</li><li>(b) Infirmier / Infirmière / Médecin / Docteur</li><li>(c) Boulanger / Boulangère</li><li>(d) Juge / Magistrat</li><li>(e) Menuisier / Charpentier</li><li>(f) Secrétaire</li><li>(g) Professeur / Enseignant</li><li>(h) Cordonnier</li><li>(i) Cuisinier / Chef</li><li>(j) Coiffeur / Coiffeuse</li></ul>'
                },
                {
                    number: '2',
                    text: '<strong>COMPOSITION [40 marks]</strong><br>Vous venez de recevoir le message suivant sur WhatsApp:<br><br>"Salut! J\'espère que tu passes de bonnes vacances. Moi, je suis à Cape Coast chez mon oncle et je prépare mon anniversaire. C\'est le 15 juillet à l\'hôtel Savoy à 15 heures. Je t\'invite. A bientôt! - Janice"<br><br>Répondez à Janice, par message WhatsApp, pour expliquer pourquoi vous ne pouvez pas participer à l\'anniversaire. (50 à 60 mots)',
                    diagramId: 'french_2025_whatsapp',
                    answer: '<strong>Sample Answer:</strong><br>Salut Janice ! Merci beaucoup pour ton invitation. Je suis très content(e) d\'avoir de tes nouvelles. Malheureusement, je ne pourrai pas venir à ton anniversaire. Je dois voyager avec mes parents au village pour voir ma grand-mère qui est malade le 15 juillet. Je suis vraiment désolé(e). Joyeux anniversaire à l\'avance ! A bientôt.'
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
        ]
      },
      {
        title: 'PAPER 2 - ESSAY',
        instructions: 'Answer three questions only from this section.',
        marks: 60,
        questions: [
            {
                number: '1',
                text: '(a) Define Marriage.<br>(b) State four reasons why people get married.<br>(c) Outline four reasons for a successful marriage.',
                sub_questions: [
                    { number: '(a)', text: 'Definition of Marriage', answer: 'Marriage is the union between a man and a woman who have agreed to live together as husband and wife and have gone through all the procedures recognised in their society.' },
                    { number: '(b)', text: 'Reasons People get married', answer: '<ul><li>For companionship</li><li>Legitimate sexual avenue</li><li>For procreation</li><li>For mutual assistance</li><li>For social status/respect</li><li>For economic support</li><li>For social cohesion or unity among families</li><li>For security/protection</li><li>For love/Affection</li><li>Family/Societal Pressure</li></ul>' },
                    { number: '(c)', text: 'Reasons for a successful marriage', answer: '<ul><li>Faithfulness/Honesty</li><li>Hard work</li><li>Effective communication</li><li>Showing love and affection</li><li>Adequate preparation towards marriage/proper background checks</li><li>Developing a peaceful resolution to resolve conflicts</li><li>Tolerance</li><li>Understanding/Compatibility</li><li>Trust</li><li>Commitment/Sacrifice</li><li>Sexual satisfaction</li><li>Ignoring external influence/not comparing</li><li>Child bearing/Fertility</li><li>Mutual respect</li></ul>' }
                ]
            },
            {
                number: '2',
                text: '(a) (i) Explain the term Human Rights.<br>(ii) Identify four human right abuses in the community.<br>(b) Give four reasons why the society must be educated on Human Rights.',
                sub_questions: [
                    { number: '(a)(i)', text: 'Explanation of Human Rights', answer: 'Human Rights are freedoms/privileges a person cannot be deprived of without any justification (inalienable fundamental rights). E.g., Right to life, freedom of speech, freedom of movement etc.<br><strong>OR</strong><br>Human Rights are privileges/freedoms that are given by nature or law that cannot be taken from a person, e.g., Right to life, freedom of association, freedom of speech etc.' },
                    { number: '(a)(ii)', text: 'Human Right abuses', answer: '<ul><li>Bullying</li><li>Rape/Defilement</li><li>Child Trafficking/Human trafficking</li><li>Torture/Trial by ordeal</li><li>Discrimination</li><li>Denial of fair trial</li><li>Domestic abuse/Violence</li><li>Forced labour</li><li>Child labour</li><li>Mob action/instant justice</li><li>Forced marriage</li><li>Unlawful arrest/detention</li><li>Sex trade</li><li>Child neglect/Child abuse</li></ul>' },
                    { number: '(b)', text: 'Reasons for Human Rights Education', answer: '<ul><li>To encourage freedom of speech</li><li>To prevent corruption in society/Promote accountability</li><li>To protect the vulnerable in the society/reduction in fear</li><li>To live and enjoy life to the full</li><li>To enable citizens enjoy freedom of movement</li><li>Equal opportunity to everyone to earn a living</li><li>To enable citizens enjoy equal legal representation and opportunity</li><li>To enable citizens enjoy freedom of association</li><li>To create awareness</li><li>Respect for each other in society/Peaceful co-existence</li><li>To prevent crime in the society</li></ul>' }
                ]
            },
            {
                number: '3',
                text: '(a) (i) Explain the term Constitution.<br>(ii) State four important reasons why Ghana decided to practice republican system of government.<br>(b) Highlight four contributions of the 1992 constitution to the development of the nation.',
                sub_questions: [
                    { number: '(a)(i)', text: 'Explanation of Constitution', answer: 'A constitution is a body of rules and regulations that governs the way a country is run. It is the highest law of the land to which all other laws must conform. A constitution can be written or unwritten. E.g., The 1992 constitution of Ghana.' },
                    { number: '(a)(ii)', text: 'Reasons for Republican System', answer: '<ul><li>To gain sovereignty and break colonial ties</li><li>To promote nationalism and Pan-African ideals</li><li>Guarantees the fundamental human rights of the people</li><li>In order to establish institutions/organs of government</li><li>In order for citizens to choose their leaders, influence decisions and hold leaders accountable</li><li>For economic prosperity and stability</li><li>To maintain peace and stability</li><li>To control and manage the country\'s resources to the benefit of the people</li><li>To establish a strong central executive government for nation building</li><li>To promote national unity and identity</li><li>To promote democratic ideals such as accountability and Rule of law</li><li>To gain constitutional autonomy</li><li>It was considered modern and progressive compared to the constitutional monarchy</li><li>To give popular legitimacy to government</li><li>To reflect the popular demand of the will of the people</li></ul>' },
                    { number: '(b)', text: 'Contributions of 1992 Constitution', answer: '<ul><li>Prevention of dictatorial rule</li><li>Serves as a guide for change of government</li><li>Serves as terms of reference to maintain law and order</li><li>Determines type of political system used to run the country</li><li>Gives legitimacy to government and political institutions</li><li>Gives Ghana the status of nationhood</li><li>Ensures accountability and good governance</li><li>Protects human right</li><li>Establishes various organs/arms of government and their functions</li><li>Recognises chieftaincy as an institution</li><li>Allocates functions of the organs of Government</li></ul>' }
                ]
            },
            {
                number: '4',
                text: '(a) Outline four factors that led to the 1948 riots in Gold Coast.<br>(b) State four ways the 1948 riots contributed to Ghana\'s Independence.',
                sub_questions: [
                    { number: '(a)', text: 'Factors leading to 1948 riots', answer: '<ul><li>Shooting and killing of the three Ex-servicemen at the Osu cross road</li><li>Non-payment of pension to the veterans/Unfulfilled promises to the ex-servicemen</li><li>Unemployment among school leavers in the country</li><li>Shortage of essential commodities</li><li>Refusal to grant loans to local traders</li><li>Poor living conditions for ex-soldiers</li><li>Monopolisation of wholesale and international trade by foreigners (AWAM)</li><li>General discrimination against the local people</li><li>Introduction of conditional sales by foreign traders</li><li>Cutting down diseased cocoa trees</li><li>High cost of goods</li><li>Dissatisfaction of the Burns constitution</li><li>Resentment towards colonial rule</li></ul>' },
                    { number: '(b)', text: 'Contribution to Independence', answer: '<ul><li>It led to the formation of the Watson Commission which recommended a new constitution to be drafted as a prelude to self-rule and independence.</li><li>Dr. Kwame Nkrumah left the UGCC to form a new party, C.P.P (The Convention People\'s Party).</li><li>Gave people of Gold Coast a sense of Political awareness/Nationalism/Hatred for colonial rule.</li><li>Led the formation of the Coussey Committee that drew the 1951 constitution of the Gold Coast/Constitutional reform.</li><li>More Africans were recommended to lead the Civil Service.</li><li>More schools were to be set up to Educate Gold Coasters.</li><li>It led to the arrest of the Big Six which made them popular.</li><li>Led to an increase in the number of Gold Coasters in both the Legislature and Executive Council.</li><li>It drew international attention to Gold Coast\'s struggle for independence.</li></ul>' }
                ]
            },
            {
                number: '5',
                text: '(a) (i) Explain the concept of Social Security.<br>(ii) List four National Social Security Schemes available in Ghana.<br>(b) Give four reasons to convince any individual to join a social security scheme in Ghana.',
                sub_questions: [
                    { number: '(a)(i)', text: 'Concept of Social Security', answer: 'Social security is a program by society/public to provide income, security and protection against the future, old age and unforeseen circumstances such as invalidity, sickness or death of a breadwinner.' },
                    { number: '(a)(ii)', text: 'National Social Security Schemes', answer: '<ul><li>Social Security and National Insurance Trust (SSNIT)</li><li>National Health Insurance Scheme</li><li>National Pension Scheme</li><li>State Insurance Corporation</li><li>Micro Insurance Schemes e.g., GLICO, Providence Life, Leap, Tier II and III</li></ul>' },
                    { number: '(b)', text: 'Reasons to join Social Security', answer: '<ul><li>Financial security</li><li>For medical care/Sick benefit</li><li>Poverty prevention</li><li>Surviving benefit/Death benefit of dependents</li><li>For retirement benefits and old age</li><li>For economic stability</li><li>For disability benefits/invalidity benefit</li></ul>' }
                ]
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
            instructions: 'Answer all questions. Each question is followed by four options lettered A to D. Find the correct option for each question.',
            marks: 40,
            questions: [
                {
                    number: '1',
                    text: 'If 3n + 2 = 8, find the value of n.',
                    options: [
                        { key: 'A', text: '10' },
                        { key: 'B', text: '6' },
                        { key: 'C', text: '3' },
                        { key: 'D', text: '2' }
                    ],
                    answer: 'D'
                },
                {
                    number: '2',
                    text: 'Expand and simplify: 2(3a + 1) - 3(4a - 3).',
                    options: [
                        { key: 'A', text: '11 - 5a' },
                        { key: 'B', text: '11 - 6a' },
                        { key: 'C', text: '11 + 5a' },
                        { key: 'D', text: '11 + 6a' }
                    ],
                    answer: 'B'
                },
                {
                    number: '3',
                    text: 'The area of a rectangular card is 15 cm². If each side of the card is enlarged by a scale factor 3, find the area of the enlarged card.',
                    options: [
                        { key: 'A', text: '45 cm²' },
                        { key: 'B', text: '75 cm²' },
                        { key: 'C', text: '90 cm²' },
                        { key: 'D', text: '135 cm²' }
                    ],
                    answer: 'D'
                },
                {
                    number: '4',
                    text: 'Factorize: 5ay - by + 15a - 3b.',
                    options: [
                        { key: 'A', text: '(y + 3)(5a - b)' },
                        { key: 'B', text: '(y + 5)(3a - b)' },
                        { key: 'C', text: '(y - 3)(5a + b)' },
                        { key: 'D', text: '(y - 5)(3a + b)' }
                    ],
                    answer: 'A'
                },
                {
                    number: '5',
                    text: 'Mr Adu bought 400 bags of maize for his farm animals. If he used 120 bags to feed the animals, find the percentage of the maize left.',
                    options: [
                        { key: 'A', text: '70%' },
                        { key: 'B', text: '60%' },
                        { key: 'C', text: '50%' },
                        { key: 'D', text: '40%' }
                    ],
                    answer: 'A'
                },
                {
                    number: '6',
                    text: 'A man spends GH¢ 560.00 out of his weekly wage of GH¢ 700.00 and saves the rest. What percentage did he save?',
                    options: [
                        { key: 'A', text: '10%' },
                        { key: 'B', text: '15%' },
                        { key: 'C', text: '20%' },
                        { key: 'D', text: '25%' }
                    ],
                    answer: 'C'
                },
                {
                    number: '7',
                    text: 'Solve: 3(x - 5) > 15 - 4(8 - x).',
                    options: [
                        { key: 'A', text: 'x < -32' },
                        { key: 'B', text: 'x < -2' },
                        { key: 'C', text: 'x < 2' },
                        { key: 'D', text: 'x < 32' }
                    ],
                    answer: 'C'
                },
                {
                    number: '8',
                    text: 'Esi made sales of 15 twenty cedi notes, 14 ten cedi notes and 15 two cedi notes. Find her total sales.',
                    options: [
                        { key: 'A', text: 'GH¢ 305.00' },
                        { key: 'B', text: 'GH¢ 440.00' },
                        { key: 'C', text: 'GH¢ 470.00' },
                        { key: 'D', text: 'GH¢ 740.00' }
                    ],
                    answer: 'C'
                },
                {
                    number: '9',
                    text: 'When 0.24 is expressed in the lowest form as a/b, the denominator is',
                    options: [
                        { key: 'A', text: '2' },
                        { key: 'B', text: '5' },
                        { key: 'C', text: '25' },
                        { key: 'D', text: '125' }
                    ],
                    answer: 'C'
                },
                {
                    number: '10',
                    text: 'Solve: 4x - 2(x + 5) = -10.',
                    options: [
                        { key: 'A', text: 'x = -10' },
                        { key: 'B', text: 'x = 0' },
                        { key: 'C', text: 'x = -½' },
                        { key: 'D', text: 'x = -2' }
                    ],
                    answer: 'B'
                },
                {
                    number: '11',
                    text: 'A rectangular container with dimensions 5 m by 3 m by 4 m is two-third full of water. Find the volume occupied by the water in the container.',
                    options: [
                        { key: 'A', text: '50 m³' },
                        { key: 'B', text: '40 m³' },
                        { key: 'C', text: '30 m³' },
                        { key: 'D', text: '20 m³' }
                    ],
                    answer: 'B'
                },
                {
                    number: '12',
                    text: 'Ama is three times as old as Kofi. The sum of their ages is 40. How old is Ama?',
                    options: [
                        { key: 'A', text: '10 years' },
                        { key: 'B', text: '30 years' },
                        { key: 'C', text: '37 years' },
                        { key: 'D', text: '43 years' }
                    ],
                    answer: 'B'
                },
                {
                    number: '13',
                    text: 'A point (-2, 3) is reflected in the x-axis. Find the image of the point.',
                    options: [
                        { key: 'A', text: '(-3, -2)' },
                        { key: 'B', text: '(-3, 2)' },
                        { key: 'C', text: '(-2, -3)' },
                        { key: 'D', text: '(-2, 3)' }
                    ],
                    answer: 'C'
                },
                {
                    number: '14',
                    text: 'A farmer feeds 20 goats with 500 kg of cassava. How many goats can be fed with 200 kg of cassava?',
                    options: [
                        { key: 'A', text: '2' },
                        { key: 'B', text: '5' },
                        { key: 'C', text: '8' },
                        { key: 'D', text: '10' }
                    ],
                    answer: 'C'
                },
                {
                    number: '15',
                    text: 'In an examination, Abu answered nine questions in 2 hours. He spent 20 minutes on the first question and the same time on each of the remaining questions. How many minutes did he spend on each of the other questions?',
                    options: [
                        { key: 'A', text: '8.0 minutes' },
                        { key: 'B', text: '10.0 minutes' },
                        { key: 'C', text: '12.0 minutes' },
                        { key: 'D', text: '12.5 minutes' }
                    ],
                    answer: 'D'
                },
                {
                    number: '16',
                    text: 'A trader sold half of a piece of cloth and used two-fifths of the remaining to sew a dress. What fraction of the cloth was left?',
                    options: [
                        { key: 'A', text: '1/10' },
                        { key: 'B', text: '3/10' },
                        { key: 'C', text: '1/5' },
                        { key: 'D', text: '1/2' }
                    ],
                    answer: 'B'
                },
                {
                    number: '17',
                    text: 'Solve: 2^x = 8 × 2^0.',
                    options: [
                        { key: 'A', text: 'x = 3' },
                        { key: 'B', text: 'x = 2' },
                        { key: 'C', text: 'x = -2' },
                        { key: 'D', text: 'x = -3' }
                    ],
                    answer: 'A'
                },
                {
                    number: '18',
                    text: 'A boy walked round a circular pond once. If the radius of the pond is 28 m, find the distance covered. [Take π = 22/7]',
                    options: [
                        { key: 'A', text: '44 m' },
                        { key: 'B', text: '88 m' },
                        { key: 'C', text: '176 m' },
                        { key: 'D', text: '252 m' }
                    ],
                    answer: 'C'
                },
                {
                    number: '19',
                    text: 'The points M(1, 3) and N(4, 5) are in the number plane. Find the vector MN.',
                    options: [
                        { key: 'A', text: '(3, 2)' },
                        { key: 'B', text: '(-3, -2)' },
                        { key: 'C', text: '(5, 8)' },
                        { key: 'D', text: '(-5, -8)' }
                    ],
                    answer: 'A'
                },
                {
                    number: '20',
                    text: 'Find the rule for the mapping:\nx: 1, 2, 3, 4\ny: 9, 20, 31, 42',
                    options: [
                        { key: 'A', text: 't → 10t - 1' },
                        { key: 'B', text: 't → 8t + 1' },
                        { key: 'C', text: 't → 11t - 2' },
                        { key: 'D', text: 't → 7t + 2' }
                    ],
                    answer: 'C'
                },
                {
                    number: '21',
                    text: 'If 2y = 5 - 3x, find x when y = 1.',
                    options: [
                        { key: 'A', text: '-2/3' },
                        { key: 'B', text: '-1' },
                        { key: 'C', text: '0' },
                        { key: 'D', text: '1' }
                    ],
                    answer: 'D'
                },
                {
                    number: '22',
                    text: 'Given that 0.03 × y = 2.4, find the value of y.',
                    options: [
                        { key: 'A', text: '0.08' },
                        { key: 'B', text: '0.8' },
                        { key: 'C', text: '8.0' },
                        { key: 'D', text: '80.0' }
                    ],
                    answer: 'D'
                },
                {
                    number: '23',
                    text: 'Find the gradient of the line which passes through the points (2, 3) and (-4, 5).',
                    options: [
                        { key: 'A', text: '-3' },
                        { key: 'B', text: '-1/3' },
                        { key: 'C', text: '1/3' },
                        { key: 'D', text: '3' }
                    ],
                    answer: 'B'
                },
                {
                    number: '24',
                    text: 'Two interior angles of a triangle are (3x - 10)° and (4x + 20)°. Find an expression for the third angle.',
                    options: [
                        { key: 'A', text: '(170 - 7x)°' },
                        { key: 'B', text: '(150 - 5x)°' },
                        { key: 'C', text: '(120 - 7x)°' },
                        { key: 'D', text: '(100 - 5x)°' }
                    ],
                    answer: 'A'
                },
                {
                    number: '25',
                    text: 'If a = (-2, 1) and b = (-5, -3), find 2a - b.',
                    options: [
                        { key: 'A', text: '(1, 5)' },
                        { key: 'B', text: '(-9, -1)' },
                        { key: 'C', text: '(5, 1)' },
                        { key: 'D', text: '(-1, -1)' }
                    ],
                    answer: 'A'
                },
                {
                    number: '26',
                    text: 'It costs a carpenter GH¢ 25.00 to make a chair. How much should it be sold to make a profit of 40%.',
                    options: [
                        { key: 'A', text: 'GH¢ 15.00' },
                        { key: 'B', text: 'GH¢ 35.00' },
                        { key: 'C', text: 'GH¢ 40.00' },
                        { key: 'D', text: 'GH¢ 50.00' }
                    ],
                    answer: 'B'
                },
                {
                    number: '27',
                    text: 'Ama has 4 one cedi notes and orders an ice cream for GH¢ 1.75 and two toffees at 50 GP each. How much does she have left?',
                    options: [
                        { key: 'A', text: 'GH¢ 1.25' },
                        { key: 'B', text: 'GH¢ 1.75' },
                        { key: 'C', text: 'GH¢ 2.25' },
                        { key: 'D', text: 'GH¢ 2.75' }
                    ],
                    answer: 'A'
                },
                {
                    number: '28',
                    text: 'A trader received a commission of 5% on goods sold at GH¢ 25,000.00. Find the commission.',
                    options: [
                        { key: 'A', text: 'GH¢ 1,250.00' },
                        { key: 'B', text: 'GH¢ 1,200.00' },
                        { key: 'C', text: 'GH¢ 1,100.00' },
                        { key: 'D', text: 'GH¢ 1,000.00' }
                    ],
                    answer: 'A'
                },
                {
                    number: '29',
                    text: 'Which of the following inequalities is represented on the number line? (Arrow pointing left from open circle at 2)',
                    options: [
                        { key: 'A', text: 'x < 2' },
                        { key: 'B', text: 'x ≤ 3' },
                        { key: 'C', text: 'x > 3' },
                        { key: 'D', text: 'x ≥ 2' }
                    ],
                    answer: 'A'
                },
                {
                    number: '30',
                    text: 'Multiply (8s - 7) by (8s + 7).',
                    options: [
                        { key: 'A', text: '64s² + 49' },
                        { key: 'B', text: '64s² - 49' },
                        { key: 'C', text: '16s² - 42' },
                        { key: 'D', text: '16s² + 42' }
                    ],
                    answer: 'B'
                },
                {
                    number: '31',
                    text: 'The population of a town is 56782. What is this number to three significant figures?',
                    options: [
                        { key: 'A', text: '567' },
                        { key: 'B', text: '568' },
                        { key: 'C', text: '56700' },
                        { key: 'D', text: '56800' }
                    ],
                    answer: 'D'
                },
                {
                    number: '32',
                    text: 'Find the largest value of these numbers: -1, 0, -6, -3.',
                    options: [
                        { key: 'A', text: '0' },
                        { key: 'B', text: '-1' },
                        { key: 'C', text: '-3' },
                        { key: 'D', text: '-6' }
                    ],
                    answer: 'A'
                },
                {
                    number: '33',
                    text: 'A box contains 10 green and 8 white balls of the same size. If a ball is selected at random from the box, what is the probability that it is green?',
                    options: [
                        { key: 'A', text: '10/18' },
                        { key: 'B', text: '4/5' },
                        { key: 'C', text: '5/9' },
                        { key: 'D', text: '4/9' }
                    ],
                    answer: 'C'
                },
                {
                    number: '34',
                    text: 'Express 36 as a product of primes.',
                    options: [
                        { key: 'A', text: '2 × 3' },
                        { key: 'B', text: '2² × 3²' },
                        { key: 'C', text: '2² × 3³' },
                        { key: 'D', text: '2³ × 3²' }
                    ],
                    answer: 'B'
                },
                {
                    number: '35',
                    text: 'Describe the set of M = {2, 3, 5, 7, 11, 13, 17, 19} in words.',
                    options: [
                        { key: 'A', text: 'M = {odd numbers less than 20}' },
                        { key: 'B', text: 'M = {factors of 19}' },
                        { key: 'C', text: 'M = {prime numbers less than 20}' },
                        { key: 'D', text: 'M = {whole numbers less than 20}' }
                    ],
                    answer: 'C'
                },
                {
                    number: '36',
                    text: 'A survey shows that 28% of all the men in a village are vegetarian. What is the probability that a man selected at random from the village is a vegetarian?',
                    options: [
                        { key: 'A', text: '7/25' },
                        { key: 'B', text: '41/50' },
                        { key: 'C', text: '1/2' },
                        { key: 'D', text: '1' }
                    ],
                    answer: 'A'
                },
                {
                    number: '37',
                    text: 'Given that P = {4, 8, 12, 16, 20} and Q = {2, 4, 6, 8, 10}, find the product of the members of (P ∩ Q).',
                    options: [
                        { key: 'A', text: '12' },
                        { key: 'B', text: '18' },
                        { key: 'C', text: '24' },
                        { key: 'D', text: '32' }
                    ],
                    answer: 'D'
                },
                {
                    number: '38',
                    text: 'Anowa scored an average of 53 in Science and Mathematics. If she scored 50 and 60 in English Language and Social Studies respectively, find her mean score in all the four subjects.',
                    options: [
                        { key: 'A', text: '57' },
                        { key: 'B', text: '56' },
                        { key: 'C', text: '55' },
                        { key: 'D', text: '54' }
                    ],
                    answer: 'D'
                },
                {
                    number: '39',
                    text: 'What is the missing number in the sequence: -5, -2, 1, ..., 7?',
                    options: [
                        { key: 'A', text: '2' },
                        { key: 'B', text: '3' },
                        { key: 'C', text: '4' },
                        { key: 'D', text: '5' }
                    ],
                    answer: 'C'
                },
                {
                    number: '40',
                    text: 'Charles and Helen started a business with an amount of GH¢ 7,000.00. If their contributions were in the ratio 4:3 respectively, find Helen\'s contribution.',
                    options: [
                        { key: 'A', text: 'GH¢ 2,500.00' },
                        { key: 'B', text: 'GH¢ 3,000.00' },
                        { key: 'C', text: 'GH¢ 4,000.00' },
                        { key: 'D', text: 'GH¢ 5,000.00' }
                    ],
                    answer: 'B'
                }
            ]
        },
        {
            title: 'PAPER 2 - ESSAY',
            instructions: 'Answer four questions only.',
            marks: 60,
            questions: [
                {
                    number: '1',
                    text: '(a) Given that P = {multiples of 3} and Q = {positive even numbers} are subsets of U = {x: 1 < x ≤ 20}.<br>(i) List the elements in P ∩ Q.<br>(ii) List all the subsets in P ∩ Q.<br><br>(b) If 1/y = 3k - 2/x,<br>(i) make y the subject of the relation.<br>(ii) using the result in (b)(i), find the value of y when x = -1 and k = 2.',
                    sub_questions: [
                        {
                            number: '(a)',
                            text: '',
                            answer: '<p><strong>(i) List elements:</strong><br>U = {2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20}<br>P = {3, 6, 9, 12, 15, 18}<br>Q = {2, 4, 6, 8, 10, 12, 14, 16, 18, 20}<br><strong>P ∩ Q = {6, 12, 18}</strong></p><p><strong>(ii) Subsets of P ∩ Q:</strong><br>{}, {6}, {12}, {18}, {6,12}, {6,18}, {12,18}, {6,12,18}</p>'
                        },
                        {
                            number: '(b)',
                            text: '',
                            answer: '<p><strong>(i) Make y subject:</strong><br>1/y = 3k - 2/x<br>1/y = (3kx - 2) / x<br>Invert both sides:<br><strong>y = x / (3kx - 2)</strong></p><p><strong>(ii) Find value of y:</strong><br>Substitute x = -1, k = 2<br>y = -1 / (3(2)(-1) - 2)<br>y = -1 / (-6 - 2)<br>y = -1 / -8<br><strong>y = 1/8</strong></p>'
                        }
                    ]
                },
                {
                    number: '2',
                    text: '(a) Evaluate (4000 × 0.35) / 0.05, leaving the answer in standard form.<br>(b) Mr Boakye gets 10% commission on type P house he sells and 15% on type Q house. He sells 3 type P houses at GH¢ 700,000.00 each and 4 type Q at GH¢ 1,400,000.00 each. Calculate the total commissions he makes.',
                    sub_questions: [
                        {
                            number: '(a)',
                            text: '',
                            answer: '<p>(4000 × 0.35) / 0.05<br>= (4 × 10³ × 35 × 10⁻²) / (5 × 10⁻²)<br>= (140 × 10) / 0.05<br>Or simply: 0.35 / 0.05 = 7<br>4000 × 7 = 28,000<br>Standard form: <strong>2.8 × 10⁴</strong></p>'
                        },
                        {
                            number: '(b)',
                            text: '',
                            answer: '<p><strong>Commission Type P:</strong><br>10/100 × 700,000 = GH¢ 70,000.00<br>For 3 houses: 3 × 70,000 = GH¢ 210,000.00</p><p><strong>Commission Type Q:</strong><br>15/100 × 1,400,000 = GH¢ 210,000.00<br>For 4 houses: 4 × 210,000 = GH¢ 840,000.00</p><p><strong>Total Commission:</strong><br>210,000 + 840,000 = <strong>GH¢ 1,050,000.00</strong></p>'
                        }
                    ]
                },
                {
                    number: '3',
                    text: '(a) Given that a = (2, 3), b = (x, -3) and c = (7, 3), find:<br>(i) the value of x, if 2a + b = c;<br>(ii) d = c - 3a;<br>(iii) |d|.<br><i>(Note: vectors are column vectors)</i><br><br>(b) A Polytank contains 4500 litres of water and 1/5 of the water is used for cleaning.<br>(i) Find the volume of water used for cleaning.<br>(ii) What percentage of water is left in the tank?',
                    sub_questions: [
                        {
                            number: '(a)',
                            text: '',
                            answer: '<p><strong>(i) Find x:</strong><br>2(2, 3) + (x, -3) = (7, 3)<br>(4, 6) + (x, -3) = (7, 3)<br>Top equation: 4 + x = 7 => <strong>x = 3</strong></p><p><strong>(ii) Find d:</strong><br>d = c - 3a<br>d = (7, 3) - 3(2, 3)<br>d = (7, 3) - (6, 9)<br>d = (7-6, 3-9)<br><strong>d = (1, -6)</strong></p><p><strong>(iii) Find |d|:</strong><br>|d| = √(1² + (-6)²)<br>|d| = √(1 + 36)<br><strong>|d| = √37 units</strong></p>'
                        },
                        {
                            number: '(b)',
                            text: '',
                            answer: '<p><strong>(i) Volume used:</strong><br>1/5 × 4500 = <strong>900 litres</strong></p><p><strong>(ii) Percentage left:</strong><br>Volume left = 4500 - 900 = 3600 litres<br>Percentage = (3600 / 4500) × 100%<br><strong>= 80%</strong></p>'
                        }
                    ]
                },
                {
                    number: '4',
                    text: '(a) A woman borrowed GH¢ 5,300.00 to pay for her child\'s university fees. If she borrowed at a rate of 8% simple interest per annum for 9 months, find the interest paid.<br>(b) A father shared his piece of land to his three children. The first child had 2/5 of the land and the second had 5 acres more than the first. If the third child had 20 acres, find how many acres of land the:<br>(i) father shared;<br>(ii) first child received;<br>(iii) second child received.',
                    sub_questions: [
                        {
                            number: '(a)',
                            text: '',
                            answer: '<p>Formula: I = (P × R × T) / 100<br>P = 5300, R = 8, T = 9/12 (years)<br>I = (5300 × 8 × 9) / (100 × 12)<br>I = (53 × 2 × 3)<br><strong>Interest = GH¢ 318.00</strong></p>'
                        },
                        {
                            number: '(b)',
                            text: '',
                            answer: '<p>Let Total Land = x.<br>1st Child = 2/5x<br>2nd Child = 2/5x + 5<br>3rd Child = 20<br><br>Equation: 2/5x + (2/5x + 5) + 20 = x<br>4/5x + 25 = x<br>25 = x - 4/5x<br>25 = 1/5x<br>x = 125<br><br><strong>(i) Father shared: 125 acres</strong><br><strong>(ii) First child:</strong> 2/5 × 125 = <strong>50 acres</strong><br><strong>(iii) Second child:</strong> 50 + 5 = <strong>55 acres</strong></p>'
                        }
                    ]
                },
                {
                    number: '5',
                    text: '(a) The pie chart shows the weight (in kg) of items Mrs. Mensah bought for her household.<br>Angles: Flour (54°), Rice (108°), Sugar (36°), Gari (90°), Fish (x°).<br>(i) What angle represents fish?<br>(ii) If she bought a total of 20 kg of items,<br>(α) what is the weight of flour bought?<br>(β) express, correct to one decimal place, the weight of sugar as a percentage of the weight of rice.<br><br>(b) In a class of 30 students, five wear glasses. If a students is selected at random from the class, what is the probability that the student does not wear glasses?',
                    diagramId: 'math_2025_q5a_pie',
                    sub_questions: [
                        {
                            number: '(a)',
                            text: '',
                            answer: '<p><strong>(i) Angle for Fish:</strong><br>360° - (54° + 90° + 36° + 108°)<br>360° - 288°<br>= <strong>72°</strong></p><p><strong>(ii) (α) Weight of Flour:</strong><br>(54 / 360) × 20 kg<br>= 0.15 × 20<br>= <strong>3 kg</strong></p><p><strong>(ii) (β) Sugar % of Rice:</strong><br>(Angle Sugar / Angle Rice) × 100<br>= (36 / 108) × 100<br>= (1/3) × 100<br>= 33.333...<br>= <strong>33.3%</strong></p>'
                        },
                        {
                            number: '(b)',
                            text: '',
                            answer: '<p>Total students = 30<br>Wear glasses = 5<br>Do not wear glasses = 30 - 5 = 25<br>Probability = 25 / 30<br>= <strong>5/6</strong></p>'
                        }
                    ]
                },
                {
                    number: '6',
                    text: 'Adamu was travelling a distance of 40 km from Kadumgu to Datanu. Sixty minutes after starting the journey, he made a stop at Cooltown, 10 km from Kadumgu to rest for 30 minutes. He then continued the journey from Cooltown and reached Datanu 60 minutes later.<br>(a) Using a scale of 2 cm to 20 minutes on the horizontal axis and 2 cm to 5 km on the vertical axis, draw a distance-time graph for Adamu\'s journey.<br>(b) Use the graph to determine the:<br>(i) distance from Cooltown to Datanu;<br>(ii) total time taken by Adamu to make the whole journey including the rest time;<br>(iii) average speed of Adamu from Cooltown to Datanu.<br>(c) If Adamu did not rest but travelled to Datanu within the time, what was his average speed?',
                    diagramId: 'math_2025_q6_graph',
                    sub_questions: [
                        {
                            number: '(a)',
                            text: 'Graph Construction Points',
                            answer: '<ul><li>Start: (0, 0)</li><li>Arrive Cooltown: (60 mins, 10 km)</li><li>Rest (30 mins): Horizontal line to (90 mins, 10 km)</li><li>Arrive Datanu (60 mins later): (150 mins, 40 km)</li></ul>'
                        },
                        {
                            number: '(b)',
                            text: '',
                            answer: '<p><strong>(i) Distance Cooltown to Datanu:</strong><br>40 km - 10 km = <strong>30 km</strong></p><p><strong>(ii) Total time:</strong><br>150 minutes</p><p><strong>(iii) Average Speed (Cooltown to Datanu):</strong><br>Distance = 30 km, Time = 60 mins = 1 hr<br>Speed = 30 / 1 = <strong>30 km/h</strong></p>'
                        },
                        {
                            number: '(c)',
                            text: '',
                            answer: '<p>Total Distance = 40 km<br>Total Time = 150 mins = 2.5 hours<br>Average Speed = 40 / 2.5<br>= <strong>16 km/h</strong></p>'
                        }
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
    subject: 'English Language', 
    sections: [
        { 
            title: 'PART A - WRITING', 
            instructions: 'Answer one question only from this part. Your composition should be about 250 words long.', 
            marks: 30, 
            questions: [
                { 
                    number: '1', 
                    text: 'A new curriculum has been introduced for Junior High Schools, but your school offers only a limited number of subjects. Write a letter to your headteacher suggesting two new subjects that should be taught in your school. Give two reasons for your choices.', 
                    answer: '<strong>Marking Scheme:</strong><br><strong>Content (10 marks):</strong><br>- Must suggest two subjects (4 marks).<br>- Must give reasons how they will help students in pursuing further studies or getting jobs (6 marks).<br><strong>Organization (5 marks):</strong><br>- Official letter format mandatory: Writer\'s address, Date, Recipient\'s designation and address, Salutation, Heading/Title, Subscription, Writer\'s signature, Writer\'s full name.<br>- Paragraphs well-developed and linked.<br><strong>Expression (10 marks):</strong><br>- Formal language, no slang/colloquialism.<br>- Clarity and varied sentence patterns.<br><strong>Mechanical Accuracy (5 marks):</strong><br>- Spelling, punctuation, grammar.' 
                },
                {
                    number: '2',
                    text: 'The government has announced the addition of new public holidays. Write an article to be published in a national newspaper on two effects of public holidays on teaching and learning.',
                    answer: '<strong>Marking Scheme:</strong><br><strong>Content (10 marks):</strong><br>- Discuss positive or negative effects.<br>- At least two points, well discussed and illustrated.<br><strong>Organization (5 marks):</strong><br>- Article format: Title/Heading, Writer\'s name (after title or at end), Writer\'s address.<br>- Paragraphs well developed.<br><strong>Expression (10 marks):</strong><br>- Formal, decent, polite expressions.<br><strong>Mechanical Accuracy (5 marks):</strong><br>- As in Question 1.'
                },
                {
                    number: '3',
                    text: 'You once doubted your abilities, but an experience changed your mindset completely. Write your story, ending with the statement, "I will never compare myself with anyone again."',
                    answer: '<strong>Marking Scheme:</strong><br><strong>Content (10 marks):</strong><br>- Narrative story ending with the statement.<br>- Clear understanding of theme.<br>- Give background of events culminating to justify the statement.<br><strong>Organization (5 marks):</strong><br>- Title, setting, plot.<br>- Beginning, climax, conclusion ending with statement.<br><strong>Expression (10 marks):</strong><br>- Decent language, blend of varied sentence patterns.<br>- Effective use of figurative language, direct speech.<br><strong>Mechanical Accuracy (5 marks):</strong><br>- As in Question 1.'
                }
            ] 
        },
        {
            title: 'PART B - READING',
            instructions: 'Read the following passage carefully and answer all the questions which follow. [20 marks]',
            marks: 20,
            questions: [
                {
                    number: '4',
                    text: `<div class="p-4 bg-slate-100 rounded text-slate-800 text-sm mb-4">
                        <p class="mb-2">I was twelve years when I came across the words "loyalty" and "decorum". I asked my father to explain them to me. His explanation impressed me so I resolved to make them my hallmarks. I tried to be as good as my words. Anytime I was rude or showed disloyalty to someone, I promptly regretted it. Soon, loyalty and decorum became characteristic of me.</p>
                        <p class="mb-2">Having completed Junior High School, my uncle, Gidi, approached my father and requested that I lived with him temporarily as his children were in America in search of greener pastures. With Daddy's consent, I went and stayed with him. However, he refused to let me return to my parents after Senior High School. Why? Daddy impressed on me the value of hardwork so I lived up to expectation.</p>
                        <p class="mb-2">Uncle decided to visit his children for the best part of a year and left his mansion and other properties under the stewardship of Lugu, his security man and me due to the trust he reposed in us. This notwithstanding, Lugu suggested we connive with some miscreants to burgle Uncle Gidi's house and share the proceeds with them. Though he persistently attempted to persuade me, I never bought into that idea. Eventually, he fled the mansion sensing I might expose him as a traitor.</p>
                        <p>Uncle returned and heard about Lugu's plan which I did not succumb to and promised to reward me substantially. However, this never materialized until the unexpected happened. His children returned and told me that when Uncle Gidi was about to go to eternity, he instructed them to reward me with a three-bedroom house and a car. All I said was "oh! loyalty."</p>
                    </div>
                    (a) What is the difference between the narrator and Lugu, according to the passage?<br>
                    (b) Why didn't the narrator's uncle let him or her go back to his or her parents' house after Senior High School?<br>
                    (c) Why didn't the narrator agree to Lugu's suggestion?<br>
                    (d) "Until the unexpected happened" What do you think happened?<br>
                    (e) Explain in your own words the following expressions as used in the passage:<br>
                    &nbsp;&nbsp;(i) be as good as my words;<br>
                    &nbsp;&nbsp;(ii) in search of greener pastures;<br>
                    &nbsp;&nbsp;(iii) the best part of a year.<br>
                    (f) For each of the following words, give another word or phrase that means the same and can fit into the passage:<br>
                    &nbsp;&nbsp;(i) promptly;<br>
                    &nbsp;&nbsp;(ii) stewardship;<br>
                    &nbsp;&nbsp;(iii) burgle;<br>
                    &nbsp;&nbsp;(iv) substantially.<br>
                    (g) In two sentences of not more than ten words each,<br>
                    &nbsp;&nbsp;(i) summarize a lesson the narrator learnt based on the last paragraph;<br>
                    &nbsp;&nbsp;(ii) give a suitable title to the passage.`,
                    answer: '',
                    sub_questions: [
                        {
                            number: '(a)',
                            text: 'Difference between narrator and Lugu:',
                            answer: 'The narrator is (loyal/trustworthy/faithful) while/whereas/whilst/but Lugu is disloyal/not trustworthy/unfaithful.<br><strong>OR</strong><br>The narrator can be trusted but Lugu cannot be trusted.'
                        },
                        {
                            number: '(b)',
                            text: 'Why uncle didn\'t let narrator go back:',
                            answer: 'He/She was hardworking/respectful <strong>OR</strong> He/She lived up to expectations.'
                        },
                        {
                            number: '(c)',
                            text: 'Why narrator didn\'t agree to suggestion:',
                            answer: 'He/She had decided to make loyalty (and decorum) his/her hallmark(s) <strong>OR</strong> Loyalty and decorum had become characteristic of him/her.'
                        },
                        {
                            number: '(d)',
                            text: 'What happened ("unexpected"):',
                            answer: 'The narrator\'s uncle died / Gidi died / The uncle died.'
                        },
                        {
                            number: '(e)',
                            text: 'Explain expressions:',
                            answer: '<strong>(i) be as good as my words:</strong> Live according to / go by (what I say / my principles / my beliefs)<br><strong>(ii) in search of greener pastures:</strong> to look for a better (job/ life) / to look for a (better-paid/ more lucrative job/ more profitable job)<br><strong>(iii) the best part of a year:</strong> more than six months / for a while / for some time / for a little while / close to twelve months / (almost/ barely) twelve months.'
                        },
                        {
                            number: '(f)',
                            text: 'Synonyms:',
                            answer: '<strong>(i) promptly:</strong> instantly / there and then / immediately / at once / without delay / quickly / instantaneously / right away / straight away<br><strong>(ii) stewardship:</strong> control / care / protection / supervision / custody / custodianship / responsibility<br><strong>(iii) burgle:</strong> steal / rob / steal from / break into / raid<br><strong>(iv) substantially:</strong> considerably / greatly / very much / a great deal / handsomely / abundantly / generously'
                        },
                        {
                            number: '(g)',
                            text: 'Summary sentences (max 10 words):',
                            answer: '<strong>(i) Lesson:</strong> (The narrator/he/she) has learnt that (loyalty/honesty) pays <strong>OR</strong> He/She has learnt that it pays to be loyal/honest <strong>OR</strong> It pays to be loyal/honest.<br><strong>(ii) Title:</strong> It pays to be loyal/honest <strong>OR</strong> There is a reward for loyalty/honesty.'
                        }
                    ]
                }
            ]
        },
        {
            title: 'PART C - LITERATURE',
            instructions: 'Answer all the questions in this part. [10 marks]',
            marks: 10,
            questions: [
                {
                    number: '5',
                    text: `Read the following extract carefully and answer Questions 5(a), 5(b) and 5(c).<br><br>
                    <strong>AMA ATAA AIDOO: The Dilemma of a Ghost</strong><br>
                    Nana: Yes, I am sitting here. So you thought I was dead?<br>
                    No, I am not. Go home, good neighbours and<br>
                    save your tears for my funeral. It cannot be long now...<br><br>
                    (a) Who are the good neighbours?<br>
                    (b) <em>It cannot be long now</em>. Why does Nana think she will die soon?<br>
                    (c) Nana is in a/an ....... mood.<br><br>
                    
                    Read the following extract carefully and answer Questions 5(d) and 5(e).<br><br>
                    <strong>KOBENA EYI ACQUAH: A Wreath of Tears</strong><br>
                    Your funeral<br>
                    was so quiet, and small-<br>
                    almost too small it is said<br>
                    for a man your stature<br><br>
                    You must<br>
                    Have preferred it that way<br><br>
                    (d) This poem is an example of a/an .......<br>
                    (e) <em>You must Have preferred it that way</em>. The above lines show that the dead person was .......<br><br>
                    
                    Read the following extract carefully and answer Questions 5(f) and 5(g).<br><br>
                    <strong>EVELYN TOOLEY HUNT: Mama is a Sunrise</strong><br>
                    When she comes slip-footing through the door,<br>
                    she kindles us<br>
                    like lump coal lighted<br>
                    and we wake up glowing.<br>
                    She puts a spark even in Papa's eyes<br>
                    and turns out all our darkness.<br><br>
                    (f) The literary device in <em>turns out all our darkness</em> is .......<br>
                    (g) <em>Mama is a Sunrise</em> is an example of which literary device?<br><br>
                    
                    Read the following extract carefully and answer Questions 5(h), 5(i) and 5(j).<br><br>
                    <strong>ERNEST HEMMINGWAY: A Day's Wait</strong><br>
                    I thought perhaps he was a little light-headed<br>
                    and after giving him the prescribed capsules<br>
                    at eleven o'clock, I went out for a while.<br><br>
                    (h) One thing that made Schatz's father think the boy was a little light-headed is .......<br>
                    (i) What exactly did the writer do when he "went out for a while"?<br>
                    (j) How did Schatz feel at the end of the story?`,
                    answer: '',
                    sub_questions: [
                        { number: '(a)', text: 'Who are the good neighbours?', answer: 'First Woman and Second Woman' },
                        { number: '(b)', text: 'Why does Nana think she will die soon?', answer: 'Because of the sorrow Ato\'s marriage has caused her / She is heartbroken because her grandson has married the descendant of slaves / Because of Ato\'s marriage to Eulalie.' },
                        { number: '(c)', text: 'Nana is in a/an ... mood.', answer: 'Sad / sorrowful / depressed / unhappy.' },
                        { number: '(d)', text: 'This poem is an example of a/an ...', answer: 'Dirge / eulogy / tribute / elegy / apostrophe' },
                        { number: '(e)', text: 'The dead person was ...', answer: 'Humble / simple / modest' },
                        { number: '(f)', text: 'Literary device in "turns out all our darkness"', answer: 'Hyperbole / metaphor' },
                        { number: '(g)', text: '"Mama is a Sunrise" is an example of which literary device?', answer: 'Metaphor' },
                        { number: '(h)', text: 'Schatz was light-headed because:', answer: 'Schatz refused to sleep / relax; / He was not interested in anything/ He told his father to leave him alone.' },
                        { number: 'i', text: 'What did the writer do when he went out?', answer: 'He took his dog for a walk/ He hunted (for quails)/ He killed two birds (coveys)' },
                        { number: '(j)', text: 'How did Schatz feel at the end?', answer: 'He felt relaxed / relieved.' }
                    ]
                }
            ]
        }
    ] 
  },
  { 
    year: 2025, 
    subject: 'Religious and Moral Education', 
    sections: [
        {
            title: 'PAPER 1 - OBJECTIVE TEST',
            instructions: 'Answer all questions. Each question is followed by four options lettered A to D. Find the correct option for each question.',
            marks: 40,
            questions: [
                { number: '1', text: 'Which of the following is the main reason for which people save money? To', options: [{key:'A', text:'donate to the needy'}, {key:'B', text:'contribute to revenue generation'}, {key:'C', text:'pay for daily expenses'}, {key:'D', text:'secure the future'}], answer: 'D' },
                { number: '2', text: 'A significant lesson learnt from Togbe Tsali\'s life is the importance of', options: [{key:'A', text:'gaining wealth through trade.'}, {key:'B', text:'prioritizing military dominance.'}, {key:'C', text:'standing against oppression and protecting one\'s people.'}, {key:'D', text:'striving for academic and professional excellence.'}], answer: 'C' },
                { number: '3', text: 'Adjoa is curious about why God created the sun, moon and stars. Which of the following is the most appropriate response for the teacher to offer? God created them', options: [{key:'A', text:'to impress human.'}, {key:'B', text:'just for decoration.'}, {key:'C', text:'to show off His creativity.'}, {key:'D', text:'to tell time and season.'}], answer: 'D' },
                { number: '4', text: 'In Islam, which practice encourages those with wealth to show concern for the poor and needy in the society?', options: [{key:'A', text:'Hajj'}, {key:'B', text:'Salat'}, {key:'C', text:'Sawn'}, {key:'D', text:'Zakat'}], answer: 'D' },
                { number: '5', text: 'In an indigenous African society where they are faced with an outbreak of drought and diseases, which of the following actions would a leader most likely take?', options: [{key:'A', text:'Encourage the community to conserve resources'}, {key:'B', text:'Seek immediate assistance from government'}, {key:'C', text:'Offer sacrifices and perform rituals to ask for divine help'}, {key:'D', text:'Declare days of fasting and prayers'}], answer: 'C' },
                { number: '6', text: 'What is the main reason for administering punishment when someone commits an offence? To', options: [{key:'A', text:'embarrass the offender'}, {key:'B', text:'make the offender pay for their actions'}, {key:'C', text:'deter others from committing similar acts'}, {key:'D', text:'satisfy the anger of the victim'}], answer: 'C' },
                { number: '7', text: 'Evans used to prefer playing with boys when he was younger, but now as an adolescent, he finds himself more comfortable spending time with girls. If you were a counselor, how would you address this change in behaviour?', options: [{key:'A', text:'Suggest the adolescent avoid interacting with the opposite sex'}, {key:'B', text:'Recommend the adolescent only form friends with his family'}, {key:'C', text:'Encourage the adolescent to suppress the feeling'}, {key:'D', text:'Encourage the adolescent to explore their emotional changes and how it affects their behaviour'}], answer: 'D' },
                { number: '8', text: 'A family is considering returning their deceased relative\'s hair, finger nails and toenails to their home town for burial. As a cultural advisor, how would you explain the importance of this practice to them? It is', options: [{key:'A', text:'a way to ensure the deceased is physically separated from the community.'}, {key:'B', text:'to honour the deceased\'s spirit and maintain their connection to their homeland.'}, {key:'C', text:'a form of punishment to the deceased for dying outside his home.'}, {key:'D', text:'a custom that promotes development.'}], answer: 'B' },
                { number: '9', text: 'You are coaching a small business owner who just experienced a setback in product development. What attitude would be most beneficial for them to adopt in order to turn the situation around?', options: [{key:'A', text:'Give up on the current product and start a new one.'}, {key:'B', text:'Blame external factors and wait for things to improve on their own.'}, {key:'C', text:'Focus solely on reducing cost without considering consumer feedback.'}, {key:'D', text:'Accept the failure, learn from experience and stay resilient.'}], answer: 'D' },
                { number: '10', text: 'A young worker just started contributing to the Social Security and National Insurance Trust (SSNIT) Pension Scheme and is curious about how it will benefit him in future. How would you explain the major aim of the scheme to this worker? The scheme', options: [{key:'A', text:'is designed to provide a one-time lump sum upon retirement.'}, {key:'B', text:'helps workers continue receiving a monthly income upon retirement.'}, {key:'C', text:'is intended to offer workers training programs during retirement.'}, {key:'D', text:'guarantees a job placement for retirees.'}], answer: 'B' },
                { number: '11', text: 'A couple is planning to marry according to Islamic law and wants to make sure they fulfill all necessary requirements. What should they do to ensure the marriage is valid?', options: [{key:'A', text:'Both parties must undergo a medical check-up.'}, {key:'B', text:'Both parties must submit a formal declaration.'}, {key:'C', text:'The marriage must be witnessed by at least two Muslim witnesses.'}, {key:'D', text:'They must have a pre-marriage counseling.'}], answer: 'C' },
                { number: '12', text: 'Which of the following preparations towards marriage helps remove fear and build trust among the would-be couple?', options: [{key:'A', text:'Discussing each partner\'s career goals'}, {key:'B', text:'Conducting a thorough background check on each other.'}, {key:'C', text:'Ignoring each other\'s past life.'}, {key:'D', text:'Keeping future plans vague to avoid disagreement.'}], answer: 'B' },
                { number: '13', text: 'When comparing religious and non-religious songs, which of the following would best explain the commonality between them? Both', options: [{key:'A', text:'are created to express personal beliefs and opinions.'}, {key:'B', text:'often focus on promoting specific political agenda.'}, {key:'C', text:'act as media for story telling and emotional expression.'}, {key:'D', text:'are only performed in a religious setting.'}], answer: 'C' },
                { number: '14', text: 'How does the statement "there is no god but Allah" in the Shahada helps Muslims shape their beliefs and actions? It', options: [{key:'A', text:'reminds Muslims to fast during Ramadan.'}, {key:'B', text:'teaches Muslims to believe in one God.'}, {key:'C', text:'tells Muslims they must go on a pilgrimage.'}, {key:'D', text:'tells Muslims to pray five times daily.'}], answer: 'B' },
                { number: '15', text: 'Which of the following explains a common occurrence in decision making in the extended family?', options: [{key:'A', text:'Everyone always agrees'}, {key:'B', text:'Many opinions can cause delay and conflict'}, {key:'C', text:'Decisions are always made quickly'}, {key:'D', text:'Only one person makes the decision'}], answer: 'B' },
                { number: '16', text: 'When analyzing the character of Egya Ahor, which pairs of virtues mostly explains his ability as a leader?', options: [{key:'A', text:'Wisdom and patience'}, {key:'B', text:'Kindness and humility'}, {key:'C', text:'Generosity and strength'}, {key:'D', text:'Courage and patriotism'}], answer: 'D' },
                { number: '17', text: 'In which of the following parables does Jesus illustrate the idea that good and bad people live together and that judgment should be left to God?', options: [{key:'A', text:'Good Samaritan'}, {key:'B', text:'Mustard seed'}, {key:'C', text:'Dishonest servant'}, {key:'D', text:'Wheat and tares'}], answer: 'D' },
                { number: '18', text: 'Which of the following attributes best explains the proverb "If you want to talk to God, talk to the wind"? God\'s', options: [{key:'A', text:'Omnipotence'}, {key:'B', text:'Omniscience'}, {key:'C', text:'Omnipresence'}, {key:'D', text:'Eternity'}], answer: 'C' },
                { number: '19', text: 'In what way does society benefit when people from different religious background interact? It', options: [{key:'A', text:'leads to more arguments between the groups.'}, {key:'B', text:'forces people to change their religious beliefs.'}, {key:'C', text:'reduces misunderstanding and encourages mutual respect.'}, {key:'D', text:'results in people abandoning their tradition.'}], answer: 'C' },
                { number: '20', text: 'Which of the following would be the least likely reason to celebrate festivals? To', options: [{key:'A', text:'promote understanding and unity'}, {key:'B', text:'mark important cultural events'}, {key:'C', text:'settle personal scores'}, {key:'D', text:'strengthen relationship within families'}], answer: 'C' },
                { number: '21', text: 'Which of the following would be the best way to design a project that encourages people to tolerate and respect different opinions in a community?', options: [{key:'A', text:'Organizing a debate where each side argues for their own opinion'}, {key:'B', text:'Hosting a meeting where only one group shares their opinion'}, {key:'C', text:'Designing an art exhibition that shows only one perspective on important social issues'}, {key:'D', text:'Creating a social media campaign that highlights the benefits of listening to others view point'}], answer: 'A' },
                { number: '22', text: 'Which of the following strategies is least effective in preventing drug abuse?', options: [{key:'A', text:'Rejecting drugs when offered'}, {key:'B', text:'Following one\'s religious teachings'}, {key:'C', text:'Exercising the body regularly'}, {key:'D', text:'Avoiding the company of bad friends'}], answer: 'C' },
                { number: '23', text: 'Which of these actions would best help in developing a strong work ethic?', options: [{key:'A', text:'Reporting bad people to the police'}, {key:'B', text:'Planning one\'s work ahead of time'}, {key:'C', text:'Increasing one\'s output at work'}, {key:'D', text:'Contributing to national development'}], answer: 'B' },
                { number: '24', text: 'Idul Fitr is best explained in one of the following: It', options: [{key:'A', text:'marks the beginning of the Islamic new year.'}, {key:'B', text:'marks the end of Ramadan and a time for thanksgiving.'}, {key:'C', text:'is observed only by those who fast for 40 days.'}, {key:'D', text:'is a holiday exclusively celebrated in Muslim communities.'}], answer: 'B' },
                { number: '25', text: 'In what way does the act of sprinkling Kpokpoi by the Gas during the Homowo festivals demonstrate their cultural values? It', options: [{key:'A', text:'marks the start of the harvest season.'}, {key:'B', text:'is a way to honour their ancestors and ask for blessing.'}, {key:'C', text:'shows the end of the festival with celebrations.'}, {key:'D', text:'shows the creation of wealth in the community.'}], answer: 'B' },
                { number: '26', text: 'Which of the following activities does not belong to the typical ways of spending leisure time?', options: [{key:'A', text:'Reading a book for relaxation'}, {key:'B', text:'Participating in a sport event'}, {key:'C', text:'Working on a project to meet deadline'}, {key:'D', text:'Watching a movie for entertainment'}], answer: 'C' },
                { number: '27', text: 'In what way does God\'s creation support human life? By', options: [{key:'A', text:'plants giving us food, oxygen and medicine'}, {key:'B', text:'mountains serving only as beautiful scenery'}, {key:'C', text:'rivers irrigating our farmlands and for fun activities.'}, {key:'D', text:'animals providing companionship to humans'}], answer: 'A' },
                { number: '28', text: 'Which of the following explains why leisure is important for a person\'s well-being? It', options: [{key:'A', text:'establishes social connections only.'}, {key:'B', text:'reduces stress and allied health conditions.'}, {key:'C', text:'supports only the sick.'}, {key:'D', text:'encourages people to spend on entertainment.'}], answer: 'B' },
                { number: '29', text: 'In what way do religious songs influence a person\'s spiritual growth? They', options: [{key:'A', text:'help people memorize religious text.'}, {key:'B', text:'serve as a form of entertainment.'}, {key:'C', text:'encourage reflection and soberness.'}, {key:'D', text:'are performed during important occasions.'}], answer: 'C' },
                { number: '30', text: 'Halima is remembered in Islamic history because she', options: [{key:'A', text:'played a key role in spreading Islam.'}, {key:'B', text:'was Muhammad\'s wet nurse.'}, {key:'C', text:'was the mother of an Islamic scholar.'}, {key:'D', text:'was the mother of the faithfuls.'}], answer: 'B' },
                { number: '31', text: 'How does rules and regulations in schools benefit students? They', options: [{key:'A', text:'make sure daily routines are followed.'}, {key:'B', text:'help create a safe space for learning.'}, {key:'C', text:'ensure only best students are rewarded.'}, {key:'D', text:'give teaches control over students.'}], answer: 'B' },
                { number: '32', text: 'What does it mean when we say God is Omniscient? God knows', options: [{key:'A', text:'only what happens in the future.'}, {key:'B', text:'everything that happens at all times.'}, {key:'C', text:'only what happens in the present.'}, {key:'D', text:'only about the actions of humans.'}], answer: 'B' },
                { number: '33', text: 'Why is it important for the youth to display courteous behaviour? It', options: [{key:'A', text:'is a sign of accepting responsibility.'}, {key:'B', text:'shows that they are educated.'}, {key:'C', text:'helps create a peaceful society.'}, {key:'D', text:'makes others see them as easy to control.'}], answer: 'C' },
                { number: '34', text: 'Which of the following options best explains decent dressing? Dressing in', options: [{key:'A', text:'a way that is stylish'}, {key:'B', text:'a way that is modest'}, {key:'C', text:'latest trends'}, {key:'D', text:'bright colours'}], answer: 'B' },
                { number: '35', text: 'Under which condition was Umar\'s conversion into Islam made possible?', options: [{key:'A', text:'His attempt to kill Ali'}, {key:'B', text:'His sister\'s earlier acceptance of Islam'}, {key:'C', text:'The impact of the Prophet\'s teachings'}, {key:'D', text:'The effect of the wicked deeds of the people'}], answer: 'B' },
                { number: '36', text: 'What is the purpose of prayer of supplication in Christianity? To', options: [{key:'A', text:'sing praises to God'}, {key:'B', text:'thank God for the gift of life'}, {key:'C', text:'ask God for assistance'}, {key:'D', text:'intercede for others'}], answer: 'C' },
                { number: '37', text: 'In which of the following ways can a father show commitment to the family?', options: [{key:'A', text:'Being punctual at work'}, {key:'B', text:'Being steadfast at prayers'}, {key:'C', text:'Providing the needs of dependents'}, {key:'D', text:'Participating in community service'}], answer: 'C' },
                { number: '38', text: 'Which of the following options can best check bribery and corruption in society?', options: [{key:'A', text:'Payment of good salaries'}, {key:'B', text:'Advocacy for a just and equitable society'}, {key:'C', text:'Easy access to loans and credit facilities'}, {key:'D', text:'Availability of Jobs'}], answer: 'A' },
                { number: '39', text: 'Walking backwards by the Ewes to escape from King Agokoli was an act of', options: [{key:'A', text:'betrayal.'}, {key:'B', text:'indifference.'}, {key:'C', text:'patriotism.'}, {key:'D', text:'intelligence.'}], answer: 'D' },
                { number: '40', text: 'Which of the following is an effect of substance abuse on the individual?', options: [{key:'A', text:'High academic performance'}, {key:'B', text:'Spiritual growth'}, {key:'C', text:'Good health'}, {key:'D', text:'Ill-health'}], answer: 'D' },
            ]
        },
        {
            title: 'PAPER 2 - SECTION A (COMPULSORY)',
            instructions: 'Answer Question 1.',
            marks: 20,
            questions: [
                {
                    number: '1',
                    text: 'Ali and Kwame worked together at a government office. One day, Mr Adu offered Ali a large sum of money to speed up the approval of a permit for his project. Although the money was tempting, Ali was not sure if he should accept it. Ali is seeking your advise as a friend:<br>(a) Explain to Ali four reasons for which he should not accept Mr Adu\'s offer. [12 marks]<br>(b) In your opinion, what four factors may cause Ali to accept Mr Adu\'s offer. [8 marks]',
                    sub_questions: [
                        {
                            number: '(a)',
                            text: 'Reasons to reject the offer (Bribery/Corruption):',
                            answer: '<ul><li>It destroys personal integrity.</li><li>It damages social and economic development.</li><li>It leads to diversion of public funds.</li><li>It undermines accountability and the Rule of Law.</li><li>It leads to execution of shoddy/poor quality work.</li><li>It causes inefficiency and low productivity.</li><li>It leads to the employment of unqualified persons (favouritism).</li><li>It increases the cost of doing business.</li><li>It tarnishes the image of the country.</li><li>It can lead to punishment (fines, imprisonment, dismissal).</li><li>It is morally and ethically wrong / against God\'s commandments.</li></ul>'
                        },
                        {
                            number: '(b)',
                            text: 'Factors that motivate acceptance:',
                            answer: '<ul><li>Poverty / financial struggles.</li><li>Lack of accountability in the system.</li><li>Greed and selfishness.</li><li>Pressure to succeed / Get-rich-quick attitude.</li><li>Poor wages and salaries.</li><li>Weak legal system.</li><li>Unemployment.</li><li>High expectations in life / Family pressure.</li><li>Bureaucracy.</li><li>Ignorance.</li><li>Decline in moral standards.</li></ul>'
                        }
                    ]
                }
            ]
        },
        { 
            title: 'PAPER 2 - SECTION B', 
            instructions: 'Answer two questions only from this section.', 
            marks: 40, 
            questions: [
                { 
                    number: '2', 
                    text: 'Kofi was raised by his grandmother who was the spiritual leader of the village. She was always fond of teaching Kofi about the importance of their tradition including sacrifice. According to her, sacrifices are made on special occasions. On one of the occasions, Kofi accompanied her to perform the sacrifice. As a student of Religious and Moral Education:<br>(a) List four items Kofi and his grandmother were likely to carry with them for the sacrifice; [4 marks]<br>(b) State four of those special occasions that required sacrifice by the teachings of Kofi\'s grandmother; [4 marks]<br>(c) Highlight four importance of sacrifices Kofi might have learnt from his grandmother. [12 marks]', 
                    sub_questions: [
                        {
                            number: '(a)',
                            text: 'Items needed for sacrifice:',
                            answer: '<ul><li>Livestock (goat, sheep, fowl, cow).</li><li>Cola nuts, Cowries.</li><li>Alcohol (Schnapps, Gin, Akpeteshie).</li><li>Water, Fire, Ash, White clay, Palm oil.</li><li>Cloth (black, red, white).</li><li>Food items (Eggs, millet, maize, yam).</li><li>Calabash, Earthen pot.</li></ul>'
                        },
                        {
                            number: '(b)',
                            text: 'Occasions requiring sacrifice:',
                            answer: '<ul><li>Thanksgiving for successful harvest.</li><li>Naming ceremonies / Birth of a child.</li><li>Marriage ceremonies.</li><li>Funeral rites.</li><li>Health and healing rituals.</li><li>Initiation ceremonies (puberty rites).</li><li>Appeasing angry spirits / seeking guidance (divination).</li><li>Installation of chiefs / festivals / New Year.</li><li>During disasters (famine, flood, disease).</li><li>Embarking on a journey / Beginning a project.</li></ul>'
                        },
                        {
                            number: '(c)',
                            text: 'Importance of sacrifices:',
                            answer: '<ul><li>Strengthens the bond between the living and ancestors/dead.</li><li>Draws one closer to the object of worship.</li><li>Teaches gratitude.</li><li>Brings people together / promotes social cohesion.</li><li>Used for purification / cleansing from negative spiritual influences / Forgiveness of sins.</li><li>Promotes physical and mental healing.</li><li>Means of seeking guidance, protection, and blessings.</li></ul>'
                        }
                    ]
                },
                { 
                    number: '3', 
                    text: 'Abu was excited as the month of Ramadan had just come to an end and it was time to celebrate Idul Fitr. Soon after, Abu\'s family began preparing for the celebration of Idul Ad-ha. Abu became curious, asked his father how different Idul Fitr is from Idul Ad-ha and what these festivals meant to Muslims. As someone who has studied religious festivals:<br>(a) Outline four differences Abu\'s father is likely to tell him about the two festivals; [12 marks]<br>(b) Explain to Abu four reasons why both festivals are important to Muslims. [8 marks]', 
                    sub_questions: [
                        {
                            number: '(a)',
                            text: 'Differences between Idul Fitr and Idul Ad-ha:',
                            answer: '<ul><li><strong>Idul Fitr:</strong> Marks the end of Ramadan (fasting). <strong>Idul Ad-ha:</strong> Commemorates Ibrahim\'s willingness to sacrifice his son.</li><li><strong>Idul Fitr:</strong> 1st day of Shawwal. <strong>Idul Ad-ha:</strong> 10th day of Dhul Hijja (during Hajj).</li><li><strong>Idul Fitr:</strong> Focuses on gratitude for completing the fast and giving Zakat al-Fitr. <strong>Idul Ad-ha:</strong> Focuses on obedience and slaughtering a sacrificial animal.</li><li><strong>Idul Fitr:</strong> Celebrated for 1 day. <strong>Idul Ad-ha:</strong> Officially celebrated for 1-3 days.</li><li><strong>Idul Fitr:</strong> Comes before Idul Ad-ha.</li></ul>'
                        },
                        {
                            number: '(b)',
                            text: 'Importance of festivals to Muslims:',
                            answer: '<ul><li>Renew faith and strengthen relationship with Allah.</li><li>Reflect on spiritual journey.</li><li>Promote unity and belonging among family and community.</li><li>Encourage generosity/charity (Zakat/sharing meat) to the poor.</li><li>Pass down religious traditions to younger generations.</li><li>Opportunity for happiness/rest/celebration.</li><li>Teaches self-discipline and compassion / obedience and sacrifice.</li></ul>'
                        }
                    ]
                },
                { 
                    number: '4', 
                    text: 'At an annual festival, two music groups were invited to perform. One group sang about faith, hope and trust in God. The other group sang songs that celebrated kindness, unity and the beauty of life. After the event, the teacher asked the students to think about the differences they observed between the two types of songs performed and what they learnt from them. As one of the students at the event:<br>(a) Identify four differences your teacher is expecting you to give on the two types of songs performed at the event? [12 marks]<br>(b) Explain to other students who were not at the event four lessons you learnt while listening to the songs. [8 marks]', 
                    sub_questions: [
                        {
                            number: '(a)',
                            text: 'Differences between Religious and Non-religious songs:',
                            answer: '<ul><li><strong>Religious:</strong> Spiritual themes, sacred purposes, inspire devotion. <strong>Non-religious:</strong> Secular themes (love, nature), entertainment, social messages.</li><li><strong>Religious:</strong> References sacred texts/figures (God, Jesus, Allah). <strong>Non-religious:</strong> Secular lyrics focusing on human emotions/world.</li><li><strong>Religious:</strong> Solemn/uplifting tones reflecting sacredness. <strong>Non-religious:</strong> Variety of tones (joyful, energetic, sad).</li><li><strong>Religious:</strong> Express believer\'s faith. <strong>Non-religious:</strong> Reflect singer\'s mood or social commentary.</li><li><strong>Religious:</strong> Meant for believers. <strong>Non-religious:</strong> Meant for broader audience.</li></ul>'
                        },
                        {
                            number: '(b)',
                            text: 'Lessons learnt:',
                            answer: '<ul><li>Songs lift the spirit and give hope during hard times.</li><li>They promote peace, unity, cooperation and friendship.</li><li>They teach moral values (honesty, love, kindness, forgiveness, obedience).</li><li>They address social issues (injustice, poverty).</li><li>Religious songs encourage repentance, self-examination, and disciplined life.</li><li>Inspire people to pursue dreams and overcome challenges.</li><li>Encourage respect for different beliefs/lifestyles.</li></ul>'
                        }
                    ]
                },
                { 
                    number: '5', 
                    text: '(a) Narrate the creation story as found in the Bible. [12 marks]<br>(b) Explain four ways humans can protect God\'s creation. [8 marks]', 
                    sub_questions: [
                        {
                            number: '(a)',
                            text: 'Creation Story (Bible):',
                            answer: '<ul><li>In the beginning, earth was without form, void, and full of darkness. Spirit of God moved on water.</li><li><strong>Day 1:</strong> God created Light, separated from darkness (Day/Night).</li><li><strong>Day 2:</strong> God created the Sky/Firmament, dividing waters above and below.</li><li><strong>Day 3:</strong> God created Dry Land, Sea, and Vegetation (Plants/Trees).</li><li><strong>Day 4:</strong> God created Lights in the sky (Sun, Moon, Stars).</li><li><strong>Day 5:</strong> God created Sea creatures (fishes) and Birds.</li><li><strong>Day 6:</strong> God created Land animals (livestock, beasts) and Man (in His image, male and female).</li><li><strong>Day 7:</strong> God rested.</li></ul>'
                        },
                        {
                            number: '(b)',
                            text: 'Ways to protect God\'s creation:',
                            answer: '<ul><li>Avoid littering/keep environment clean/clean-up exercises.</li><li>Plant trees and protect forests (afforestation).</li><li>Avoid pollution (air, water etc.).</li><li>Use resources wisely and avoid wastage.</li><li>Good farming and fishing methods.</li><li>Good mining methods (responsible mining).</li><li>Avoid dumping waste in drains.</li><li>Respect for human and animal life (avoid murder/abortion).</li><li>Public education on environment.</li><li>Recycling.</li><li>Enforcement of environmental laws.</li></ul>'
                        }
                    ]
                }
            ] 
        }
    ] 
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
    sections: [
        {
            title: 'PAPER 1 - OBJECTIVE TEST',
            instructions: 'Answer all questions. Each question is followed by four options lettered A to D. Find the correct option for each question.',
            marks: 40,
            questions: [
                { number: '1', text: 'Sε ɔbaa wo ntaafoc na wɔyɛ mmaa anaa mmarima baanu a, wɔfrɛ wɔn sɛn?', options: [{key:'A', text:'Ahinasa'}, {key:'B', text:'Ata panin ne Ata kumaa'}, {key:'C', text:'Ntaten'}, {key:'D', text:'Takyi ne Anane'}], answer: 'B' },
                { number: '2', text: 'Nsuo ne nsa a wɔde sɔ abɔfra anom wɔ abadintoɔ mu no kyerɛ sɛn?', options: [{key:'A', text:'Abɔfra no ani bɛyɛ den.'}, {key:'B', text:'Abɔfra no bɛnya ayaresa.'}, {key:'C', text:'Abɔfra no bɛnya ahoɔden.'}, {key:'D', text:'Abɔfra no bɛdi nokorɛ.'}], answer: 'D' },
                { number: '3', text: 'Adɛn nti na wɔto abɔfra bi din?', options: [{key:'A', text:'Ɛmma abɔfra no nyera.'}, {key:'B', text:'Ɛma yɛhunu sɛ onipa no ho hia.'}, {key:'C', text:'Ɛma yɛhunu sɛ ɔyɛ ɔkanni ba.'}, {key:'D', text:'Yɛde hyɛ onipa no nso.'}], answer: 'A' },
                { number: '4', text: 'Ansa na wɔbɛgoro obi bra no, wɔde no kɔkyerɛ hwan?', options: [{key:'A', text:'Abosom'}, {key:'B', text:'Abusua panin'}, {key:'C', text:'Ohemaa'}, {key:'D', text:'Ohene'}], answer: 'C' },
                { number: '5', text: 'Wei yɛ mfasoɔ a yɛnya wɔ awareɛ mu. Ede ........', options: [{key:'A', text:'animuonyam ba abusua mu'}, {key:'B', text:'apereapereɛ ba nnipa ntam'}, {key:'C', text:'ɛka ba abusua no mu'}, {key:'D', text:'koratwe ba awareɛ mu'}], answer: 'B' },
                { number: '6', text: 'Sε mpanimfoɔ regu awareɛ a, ɛdeɛn na wɔma awarefoɔ no yɛ? Wɔma obiara ........', options: [{key:'A', text:'bɔ ne nkuro'}, {key:'B', text:'bu akonta ansa'}, {key:'C', text:'didi ansa'}, {key:'D', text:'ka ntam'}], answer: 'C' },
                { number: '7', text: 'Deɛ ɛdidi soɔ yi mu baako nka asɛm a wɔgyina so gyae awareɛ wɔ Akanman mu ho. Obaa a ........', options: [{key:'A', text:'ɔnom ne kunu abusuafoɔ'}, {key:'B', text:'ɔyɛ obonini'}, {key:'C', text:'wɔawo ntaafoɔ mprenu'}, {key:'D', text:'wɔakyerɛ awia'}], answer: 'A' },
                { number: '8', text: 'Sε obi di owufoɔ bi adeɛ a, ɛdeɛn na ɛsɛ sɛ ɔyɛ?', options: [{key:'A', text:'Ode owufoɔ no agyapadeɛ kyɛ ne mma.'}, {key:'B', text:'Ɔhwɛ owufoɔ no agyapadeɛ so.'}, {key:'C', text:'Ɔkyekyɛ owufoɔ no agyapadeɛ ma abusua.'}, {key:'D', text:'Otɔn owufoɔ no agyapadeɛ nyinaa.'}], answer: 'D' },
                { number: '9', text: 'Sε obi de ka na ɔwu a, hwan na ɛsɛ sɛ ɔtua ka no?', options: [{key:'A', text:'Abusua panin'}, {key:'B', text:'Anuanom'}, {key:'C', text:'Ne mma'}, {key:'D', text:'Odiadefoɔ'}], answer: 'D' },
                { number: '10', text: 'Obarima bi wu na odiadefoɔ no ware ne yere a, wɔfrɛ saa awareɛ no sɛn?', options: [{key:'A', text:'Ayete'}, {key:'B', text:'Kunadɔsɔ'}, {key:'C', text:'Kunayere'}, {key:'D', text:'Yɛyere'}], answer: 'C' },
                { number: '11', text: 'Sε ɔbaa de abɔfra bi kɔware ɔbarima a, wɔfrɛ saa abɔfra no sɛn?', options: [{key:'A', text:'Abanoma'}, {key:'B', text:'Babɔne'}, {key:'C', text:'Bagyina'}, {key:'D', text:'Banana'}], answer: 'A' },
                { number: '12', text: 'Sε wo papa ware mmaa baanu a, ɔbaa baako no yɛ wo maame deɛn?', options: [{key:'A', text:'Akummaa'}, {key:'B', text:'Kora'}, {key:'C', text:'Nua'}, {key:'D', text:'Yɔnko'}], answer: 'B' },
                { number: '13', text: 'Obi yɛ wo papa nuabaa a, wo deɛbɛn ne no?', options: [{key:'A', text:'Maame'}, {key:'B', text:'Nana'}, {key:'C', text:'Nuabaa'}, {key:'D', text:'Sewaa'}], answer: 'A' },
                { number: '14', text: 'Sε wɔfrɛ abɔfra bi Woarabae a, na ɛkyerɛ sɛn?', options: [{key:'A', text:'Ne maame di awommawuo.'}, {key:'B', text:'Ne maame wuu bere a ɔrewo no.'}, {key:'C', text:'Onni agya.'}, {key:'D', text:'Ɔyɛ dɔnkɔ ba.'}], answer: 'B' },
                { number: '15', text: 'Sε wɔfrɛ abɔfra bi Tutu a na ɛyɛ deɛn din?', options: [{key:'A', text:'Abosomdin'}, {key:'B', text:'Adakamudin'}, {key:'C', text:'Ahendin'}, {key:'D', text:'Apentɛdin'}], answer: 'C' },
                { number: '16', text: 'Sε wɔwo abɔfra bi ɔko berɛ mu a, wɔfrɛ no sɛn?', options: [{key:'A', text:'Manso'}, {key:'B', text:'Ahyia'}, {key:'C', text:'Antobam'}, {key:'D', text:'Bediako'}], answer: 'D' },
                { number: '17', text: 'Sε ɔkanni ka sɛ ɔne obi yɛ mogya baako a, na ɛkyerɛ sɛn?', options: [{key:'A', text:'Wɔbɔ ntɔn baako.'}, {key:'B', text:'Wɔte efie baako mu.'}, {key:'C', text:'Wɔyɛ abusɔmma.'}, {key:'D', text:'Wɔyɛ abusua.'}], answer: 'C' },
                { number: '18', text: 'Ɔkraman a egya tua n\'ano yɛ abusua bɛn akraboa?', options: [{key:'A', text:'Aduana'}, {key:'B', text:'Agona'}, {key:'C', text:'Asona'}, {key:'D', text:'Asakyiri'}], answer: 'A' },
                { number: '19', text: 'Akanman mu no, hwan na ɔtu ɔhene fo?', options: [{key:'A', text:'Gyaasehene'}, {key:'B', text:'Kurontihene'}, {key:'C', text:'Ohemmaa'}, {key:'D', text:'Ɔkyeame'}], answer: 'C' },
                { number: '20', text: 'Sε ɔhempɔn bi ka baabi a, Akanfoɔ ka sɛ ........', options: [{key:'A', text:'odupon atutu'}, {key:'B', text:'ɔberempɔn asoa bamkyiniiɛ'}, {key:'C', text:'ɔhene kɔ nsrahwɛ'}, {key:'D', text:'otumfoɔ atia mpaboa mu'}], answer: 'D' },
                { number: '21', text: 'Akanman mu no, hwan na ɔhwɛ ɔhene fotoɔ so?', options: [{key:'A', text:'Ankɔbeahene'}, {key:'B', text:'Gyaasehene'}, {key:'C', text:'Kurontihene'}, {key:'D', text:'Sannaahene'}], answer: 'C' },
                { number: '22', text: 'Adɛn nti na ɔbaa bi kunu wu a, ɛdi afe ansa na waware?', options: [{key:'A', text:'Awareɛ afono no.'}, {key:'B', text:'Ebia na wafa afuro.'}, {key:'C', text:'Ɛyɛ mmusuo sɛ ɔbɛware.'}, {key:'D', text:'Ɔbarima biara mmpɛ no bio.'}], answer: 'D' },
                { number: '23', text: 'Mfasoɔ bɛn na ɛwɔ nsawa a wɔbɔ no ayiase mu? Wɔde', options: [{key:'A', text:'boa abusuafoɔ ma wɔtua wɔn ka.'}, {key:'B', text:'gye wɔn ani.'}, {key:'C', text:'noa nnuane ma abusuafoɔ.'}, {key:'D', text:'tɔ nsa ma ɔmanfoɔ.'}], answer: 'C' },
                { number: '24', text: 'Mpanimfoɔ tu wɔn nan si asɛm so wɔ asɛnnie mu a, na ɛkyerɛ sɛn?', options: [{key:'A', text:'Abadwafoɔ no atu kwan.'}, {key:'B', text:'Wɔammu obiara fɔ.'}, {key:'C', text:'Wɔantumi anni asɛm no.'}, {key:'D', text:'Wɔatu asɛm no ahyɛ da.'}], answer: 'B' },
                { number: '25', text: 'Adɛn nti na yɛredi asɛm a, yɛhia adansefoɔ? Ema ........', options: [{key:'A', text:'amammerɛ da adi'}, {key:'B', text:'asɛm no yɛ dɛ'}, {key:'C', text:'mpanimfoɔ hunu kwadubɔfoɔ'}, {key:'D', text:'nokorɛ no da adi'}], answer: 'D' },
                { number: '26', text: 'Ɔbaatan na ....... deɛ ne ba bedie.', options: [{key:'A', text:'ɔnim'}, {key:'B', text:'ɔnnim'}, {key:'C', text:'wɔnim'}, {key:'D', text:'wɔnnim'}], answer: 'A' },
                { number: '27', text: 'Mmɛ yi mu deɛ ɛwɔ he na ɛkasa fa adedie ho?', options: [{key:'A', text:'Deɛ odwan pɛ na ɔde ne fufuo bɔ.'}, {key:'B', text:'Niwaa mma nsaeɛ a, wɔfase nni adeɛ.'}, {key:'C', text:'Wonni panin a, due.'}, {key:'D', text:'Wote faako a, wote w\'adeɛ so.'}], answer: 'A' },
                { number: '28', text: 'Toa ɛbɛ yi so: Seantie ne ɔnwam .......', options: [{key:'A', text:'amanenya'}, {key:'B', text:'atikɔ pɔ'}, {key:'C', text:'awia ahweaseɛ'}, {key:'D', text:'awiawuo'}], answer: 'C' },
                { number: '29', text: 'Wosuro atɛkyɛ mpaboa a, .......', options: [{key:'A', text:'wofira ne ntoma'}, {key:'B', text:'wohyɛ ne kyɛ'}, {key:'C', text:'wohyɛ n\'ataadeɛ'}, {key:'D', text:'wohyɛ ne pieto'}], answer: 'D' },
                { number: '30', text: 'Anansesɛm mu aberewa gyina hɔ ma deɛn?', options: [{key:'A', text:'Asɛmpɛ'}, {key:'B', text:'Nsekuro'}, {key:'C', text:'Ntoboaseɛ'}, {key:'D', text:'Nyansa'}], answer: 'D' },
                { number: '31', text: 'Abɔfoɔ sɛn na wɔkɔɔ ahayɔ no? (Reference: Da koro bi, abɔfoɔ baasa bi kɔɔ kwaeɛbirentuo bi mu...)', options: [{key:'A', text:'Baako'}, {key:'B', text:'Baanu'}, {key:'C', text:'Baasa'}, {key:'D', text:'Baanan'}], answer: 'C' },
                { number: '32', text: 'Ɛhefa na wɔkɔɔ ahayɔ no?', options: [{key:'A', text:'Adukuro mu'}, {key:'B', text:'Afuo bi mu'}, {key:'C', text:'Kwaeɛbirentuo bi mu'}, {key:'D', text:'Wiram'}], answer: 'C' },
                { number: '33', text: 'Ɛdeɛn na na ɛwɔ kukuo no mu?', options: [{key:'A', text:'Ngo'}, {key:'B', text:'Nsa'}, {key:'C', text:'Nsuo'}, {key:'D', text:'Sika kɔkɔɔ'}], answer: 'C' },
                { number: '34', text: 'Kasasu bɛn nie? ahia wɔn te sɛ asɔredan mu akura.', options: [{key:'A', text:'Anihanehane'}, {key:'B', text:'Asesɛsɛm'}, {key:'C', text:'Ɛbɛ'}, {key:'D', text:'Nnyinahɔma'}], answer: 'C' },
                { number: '35', text: 'To abasɛm no din.', options: [{key:'A', text:'Abɔfoɔ baasa bi ho asɛm'}, {key:'B', text:'Ahayɔ yɛ den'}, {key:'C', text:'Sika kɔkɔɔ'}, {key:'D', text:'Wiram ahayɔ'}], answer: 'D' },
                { number: '36', text: 'Kasasu bɛn na ɛda adi wɔ anwonsɛm no mu? (Reference: Mehyira mo o! Mehyira mo o!)', options: [{key:'A', text:'Asesɛsɛm'}, {key:'B', text:'Nteamu'}, {key:'C', text:'Ntimu'}, {key:'D', text:'Sɛ-nipa'}], answer: 'A' },
                { number: '37', text: 'Nsensaneɛ sɛn na ɛwɔ anwonsɛm no mu?', options: [{key:'A', text:'Baako'}, {key:'B', text:'Mmienu'}, {key:'C', text:'Mmiɛnsa'}, {key:'D', text:'Nnan'}], answer: 'A' },
                { number: '38', text: 'Tebea bɛn na ɔtwerɛfoɔ no wɔ mu?', options: [{key:'A', text:'Anigyeɛ'}, {key:'B', text:'Awerɛhoɔ'}, {key:'C', text:'Ehu'}, {key:'D', text:'Osuro'}], answer: 'D' },
                { number: '39', text: 'Wɔn a wɔdi dwuma wɔ ahwɛgorɔ nwoma mu no, wɔfrɛ wɔn sɛn?', options: [{key:'A', text:'Agofomma'}, {key:'B', text:'Agorɔmma'}, {key:'C', text:'Adikanfoɔ'}, {key:'D', text:'Ahwɛfoɔ'}], answer: 'B' },
                { number: '40', text: 'Sε obi di akotene yie wɔ nhoma bi mu a, na ɔyɛ deɛn?', options: [{key:'A', text:'Agorɔba ketewa'}, {key:'B', text:'Agorɔba titire'}, {key:'C', text:'Ogofɔ kɛseɛ'}, {key:'D', text:'Ogofɔ kumaa'}], answer: 'D' },
            ]
        },
        { 
            title: 'PAPER 2 - COMPOSITION', 
            instructions: 'Answer all questions.', 
            marks: 40, 
            questions: [{ 
                number: '1', 
                text: 'Translate the following sentence into your language: "The sun is shining brightly today."', 
                answer: 'Varies by language (e.g., Twi: Awia no rebɔ kɛseɛ nnɛ).' 
            }] 
        }
    ] 
  },
  { 
    year: 2025, 
    subject: 'Creative Arts and Design', 
    sections: [
        {
            title: 'PAPER 1 - OBJECTIVE TEST',
            instructions: 'Answer all questions. Each question is followed by four options lettered A to D.',
            marks: 40,
            questions: [
                { number: '1', text: 'Abiwa is printing on a fabric. She aims at ensuring even distribution of paste on the surface of the fabric. Identify the tool that she would use.', options: [{key:'A', text:'Brayer'}, {key:'B', text:'Ink pad'}, {key:'C', text:'Pallet knife'}, {key:'D', text:'Block'}], answer: 'A' },
                { number: '2', text: 'In making an artwork, Ama gathers and joins different discarded materials to create a new whole. Select the technique Ama used.', options: [{key:'A', text:'Carving'}, {key:'B', text:'Assemblage'}, {key:'C', text:'Etching'}, {key:'D', text:'Engraving'}], answer: 'B' },
                { number: '3', text: 'Select the most appropriate binder used in papier maché.', options: [{key:'A', text:'Formica glue'}, {key:'B', text:'Resin'}, {key:'C', text:'Starch'}, {key:'D', text:'White glue'}], answer: 'C' },
                { number: '4', text: 'In the design process, investigating a problem includes determining the', options: [{key:'A', text:'size and forms of the article to produce.'}, {key:'B', text:'cost of materials to use.'}, {key:'C', text:'colour, symbols and features of the products.'}, {key:'D', text:'production tools to use.'}], answer: 'A' },
                { number: '5', text: 'A 3-dimensional form of a square is the', options: [{key:'A', text:'cone.'}, {key:'B', text:'cube.'}, {key:'C', text:'cuboid.'}, {key:'D', text:'cylinder.'}], answer: 'B' },
                { number: '6', text: 'Mr. Adamu is an artist who wants to design a poster for one of his customers. Select the digital tools that he could use for the work.', options: [{key:'A', text:'A-4 sheets, scanner and a computer.'}, {key:'B', text:'Computer, A-4 sheets and Adobe photoshop.'}, {key:'C', text:'Photoshop, scanner and A-4 sheets.'}, {key:'D', text:'Scanner, Adobe photoshop and a computer.'}], answer: 'D' },
                { number: '7', text: 'Your school anthem is in 3/4 time. Which of the following conducting patterns would the conductor use?', options: [{key:'A', text:'A square-shaped pattern'}, {key:'B', text:'A triangular pattern'}, {key:'C', text:'A straight-line pattern'}, {key:'D', text:'A circular pattern'}], answer: 'B' },
                { number: '8', text: 'Many songs address topical issues in the Ghanaian community. Which of the following is not a step in transcribing such songs?', options: [{key:'A', text:'Choosing a song'}, {key:'B', text:'Listening carefully'}, {key:'C', text:'Writing down the lyrics'}, {key:'D', text:'Composing a new melody'}], answer: 'D' },
                { number: '9', text: 'How long should you hold a half note/ minim in 4/4 times?', options: [{key:'A', text:'1 beat/count'}, {key:'B', text:'2 beats/counts'}, {key:'C', text:'3 beats/counts'}, {key:'D', text:'4 beats/counts'}], answer: 'B' },
                { number: '10', text: 'In Ghana, most people wear black or red cloth during funerals to show they are mourning. However, these same colours worn by demonstrators signify their', options: [{key:'A', text:'displeasure about poor working conditions.'}, {key:'B', text:'full support towards developmental projects.'}, {key:'C', text:'happiness about working conditions.'}, {key:'D', text:'readiness to work for the country.'}], answer: 'A' },
                { number: '19', text: 'Which of the following Northern traditional dances is a war dance?', options: [{key:'A', text:'Bamaaya'}, {key:'B', text:'Nagali'}, {key:'C', text:'Takai'}, {key:'D', text:'Damba'}], answer: 'C' },
                { number: '20', text: 'In a composition, objects of the same kind and weight placed on either side of a central line forms', options: [{key:'A', text:'a formal balance.'}, {key:'B', text:'an informal balance.'}, {key:'C', text:'an irregular balance.'}, {key:'D', text:'a radial balance.'}], answer: 'A' },
                { number: '21', text: 'Your music teacher wants a song to start loudly and then gradually becomes softer. Which of the following dynamic marks would you suggest?', options: [{key:'A', text:'Crescendo'}, {key:'B', text:'Diminuendo'}, {key:'C', text:'Forte'}, {key:'D', text:'Piano'}], answer: 'B' },
                { number: '22', text: 'Sally was tasked to weave a mat. Select the best measure that she would take to ensure that the mat lies flat.', options: [{key:'A', text:'Use thicker thread'}, {key:'B', text:'Double the thread'}, {key:'C', text:'Beat the thread tighter'}, {key:'D', text:'Use fine threads'}], answer: 'C' },
                { number: '23', text: 'An artist mixes one table spoon of a red colour with another table spoon of a blue colour. What colour will the artist achieve?', options: [{key:'A', text:'Green'}, {key:'B', text:'Orange'}, {key:'C', text:'Yellow'}, {key:'D', text:'Violet'}], answer: 'D' },
                { number: '24', text: 'In creating a piece of an artwork that reflects Ghanaian traditions, which of the following would be essential to include?', options: [{key:'A', text:'Modern architectural structures'}, {key:'B', text:'Portraits of political leaders'}, {key:'C', text:'Scenes of urban life'}, {key:'D', text:'Symbols of ancestral heritage'}], answer: 'D' },
                { number: '25', text: 'Art appreciation helps one to become aware of', options: [{key:'A', text:'all the various designs in nature.'}, {key:'B', text:'all the good qualities of an art.'}, {key:'C', text:'the size of work.'}, {key:'D', text:'the title of work.'}], answer: 'B' },
                { number: '26', text: 'Your class is creating its own rhythm for a clapping exercise. If your teacher wants the class to clap softly, which dynamic mark should the class use?', options: [{key:'A', text:'Forte'}, {key:'B', text:'Andante'}, {key:'C', text:'Piano'}, {key:'D', text:'Allegro'}], answer: 'C' },
                { number: '27', text: 'Juuba intends to paint a poster with cool colours. Identify the set of cool colours Juuba could use.', options: [{key:'A', text:'Blue, yellow and violet'}, {key:'B', text:'Green, violet and blue'}, {key:'C', text:'Orange, blue and red'}, {key:'D', text:'Red, yellow and orange'}], answer: 'B' },
                { number: '28', text: 'Which of the following traditional instruments belongs to the membranophone family?', options: [{key:'A', text:'Gankogui'}, {key:'B', text:'Gyile'}, {key:'C', text:'Atumpan'}, {key:'D', text:'Axatse'}], answer: 'C' },
                { number: '29', text: 'A composer is writing a song for the school choir, which tempo marking should be used to mark portions to be performed in a lively and fast pace?', options: [{key:'A', text:'Largo'}, {key:'B', text:'Andante'}, {key:'C', text:'Allegro'}, {key:'D', text:'Moderato'}], answer: 'C' },
                { number: '30', text: 'To prevent injury when working in the art studio, one has to', options: [{key:'A', text:'clean the tools after used.'}, {key:'B', text:'leave the tools by the window.'}, {key:'C', text:'pack tools in toolbox after use.'}, {key:'D', text:'pocket sharp and pointed tools.'}], answer: 'C' },
                { number: '31', text: 'In producing sculpture, the artist uses which of the following set of materials?', options: [{key:'A', text:'Fabric, acrylic and clay.'}, {key:'B', text:'Metal, wood and clay.'}, {key:'C', text:'Metal, fabric and charcoal.'}, {key:'D', text:'Wood, conté and clay.'}], answer: 'B' },
                { number: '32', text: 'Martin Owusu is known for his contribution to the development of Ghanaian', options: [{key:'A', text:'music.'}, {key:'B', text:'dance.'}, {key:'C', text:'poetry.'}, {key:'D', text:'drama.'}], answer: 'D' },
                { number: '33', text: 'The red colour in the national flag of Ghana symbolizes', options: [{key:'A', text:'unity of the people.'}, {key:'B', text:'rich natural resources.'}, {key:'C', text:'struggle for independence.'}, {key:'D', text:'vegetation of the land.'}], answer: 'C' },
                { number: '34', text: 'Francis Nii Yartey is known for his contribution to the development of', options: [{key:'A', text:'music.'}, {key:'B', text:'dance.'}, {key:'C', text:'poetry.'}, {key:'D', text:'drama.'}], answer: 'B' },
                { number: '35', text: 'Design can be described as a', options: [{key:'A', text:'basic shape of an artwork.'}, {key:'B', text:'form of colourful artwork.'}, {key:'C', text:'plan within a work of art.'}, {key:'D', text:'skill to produce tools.'}], answer: 'C' },
                { number: '36', text: 'The area occupied by the objects in composition is described as the', options: [{key:'A', text:'background.'}, {key:'B', text:'foreground.'}, {key:'C', text:'negative space.'}, {key:'D', text:'positive space.'}], answer: 'D' },
                { number: '37', text: 'A school\'s drama club is preparing for a play. Which of the following performance space should the actors wait and get ready before stepping on to the stage?', options: [{key:'A', text:'Audience area'}, {key:'B', text:'Backstage'}, {key:'C', text:'Sound booth'}, {key:'D', text:'Lighting grid'}], answer: 'B' },
                { number: '38', text: 'If tempera, acrylic and indian ink are classified as wet media, then dry media would include', options: [{key:'A', text:'charcoal, crayon and poster colour.'}, {key:'B', text:'crayon, pastel and charcoal.'}, {key:'C', text:'poster colour, conté and pastel.'}, {key:'D', text:'pastel, poster colour and crayon.'}], answer: 'B' },
                { number: '39', text: 'During a performance, an actor needs to enter the stage without being seen before their scene begins. Which part of the performance space should he use?', options: [{key:'A', text:'Sound booth'}, {key:'B', text:'Wings'}, {key:'C', text:'Audience area'}, {key:'D', text:'Lighting grid'}], answer: 'B' },
                { number: '40', text: 'Johnny created a drawing from a scene in a dream he had. Johnny is into', options: [{key:'A', text:'figure drawing.'}, {key:'B', text:'imaginative drawing.'}, {key:'C', text:'silhoutte drawing.'}, {key:'D', text:'still life drawing.'}], answer: 'B' },
            ]
        },
        { 
            title: 'PAPER 2 - SECTION A', 
            instructions: 'Answer Question 1 and any other.', 
            marks: 30, 
            questions: [
                { 
                    number: '1', 
                    text: '', 
                    sub_questions: [
                        { 
                            number: '(a)', 
                            text: 'In the space provided, draw the six point colour wheel.<br>(i) Use the hatching technique to shade the secondary colours.<br>(ii) Use the stippling technique to shade the primary colours.', 
                            answer: 'Candidates should draw a circle divided into 6 equal sectors. Primary colours (Red, Yellow, Blue) should be stippled. Secondary colours (Orange, Green, Violet) should be hatched. Correct positioning: Red opposite Green, Blue opposite Orange, Yellow opposite Violet.' 
                        },
                        {
                            number: '(b)',
                            text: 'Your teacher tasked the class to weave a stole to be used by the final year learners for their 10th graduation celebration. As a creative student:<br>(i) enumerate the two sets of yarns that would be used for the stole;<br>(ii) describe any one of the yarns enumerated in (i) above;<br>(iii) list any two tools that would help in weaving the stole.',
                            answer: '<strong>(i) Yarns:</strong> Warp (Vertical threads) and Weft (Horizontal threads).<br><strong>(ii) Description:</strong> Warp: The set of lengthwise yarns that are held in tension on a frame or loom. Weft: The yarn which is drawn through the warp yarns to create cloth.<br><strong>(iii) Tools:</strong> Loom, Shuttle, Heddle, Beater/Reed, Bobbin.'
                        }
                    ]
                },
                {
                    number: '2',
                    text: 'The Black star party has 85,000 members. The party intends to embark on rally in December, 2025. They have therefore decided to print a new cloth for the rally. As a student artist:<br>(i) identify the most appropriate method to be used for printing the cloth for the members;<br>(ii) state two reasons for the choice of printing method identified in (i) above;<br>(iii) list three wet media that would be useful for the printing of the cloth.',
                    answer: '<strong>(i) Method:</strong> Screen Printing (Serigraphy) or Rotary Screen Printing (for mass production).<br><strong>(ii) Reasons:</strong> 1. It is economical and faster for printing large quantities (85,000 members). 2. It produces durable and vibrant prints suitable for rallies.<br><strong>(iii) Wet Media:</strong> 1. Fabric Ink/Dye. 2. Binder/Extender base. 3. Pigment emulsion.'
                },
                {
                    number: '3',
                    text: '(a) Aku has been tasked to produce a vase with clay for the upcoming interschool art competition.<br>(i) List two tests that can be done on the clay for its suitability.<br>(ii) Describe in three steps how to prepare the clay for the task.<br>(iii) Identify one technique that can be used to decorate the vase.<br>(b) The creative arts learners displayed their works for appreciation. As part of the class, explain three benefits that you will derive from this activity.',
                    answer: '<strong>(a)(i) Tests:</strong> Plasticity test (Coil test), Shrinkage test.<br><strong>(a)(ii) Preparation:</strong> 1. Digging/Mining the clay. 2. Soaking and Slaking (mixing with water). 3. Kneading/Wedging to remove air bubbles and ensure uniform consistency.<br><strong>(a)(iii) Decoration:</strong> Incising, Impressing, Applique, Slip trailing, Glazing.<br><strong>(b) Benefits of Appreciation:</strong> 1. Helps to develop critical thinking and analytical skills. 2. Encourages understanding of different cultural perspectives. 3. Improves communication skills through expressing opinions. 4. Helps to value and respect the work of others. 5. Serves as a source of inspiration.'
                }
            ] 
        }
    ] 
  },
];
