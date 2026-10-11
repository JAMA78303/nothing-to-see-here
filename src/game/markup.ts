// The stage, counter and overlays. Ported from the prototype; engine.ts drives it by id.
export const MARKUP = String.raw`<div class="app">
  <div class="top">
    <div class="brand"><b>Nothing To See Here</b> · case file</div>
    <div style="display:flex;gap:10px;align-items:center">
      <span class="pill" id="pill"><i></i><span id="pillText">This device only</span></span>
      <button class="ghost" id="openSightings" type="button">Sightings <span id="seenCount">0/22</span></button>
    </div>
  </div>

  <div class="world" id="world">
    <div class="label">The world has visited him</div>
    <div class="count" id="worldCount">0</div>
    <div class="meter"><span id="meter"></span></div>
    <div class="next" id="nextText">&nbsp;</div>
  </div>

  <div class="stage" id="stage" tabindex="0" role="button" aria-label="Poke Gerald">
    <svg viewBox="0 0 400 520" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <pattern id="bricks" width="56" height="28" patternUnits="userSpaceOnUse">
          <rect width="56" height="28" fill="var(--wall)"/>
          <path d="M0 0.5H56M0 14.5H56M28 0V14M0 14V28M56 14V28" stroke="var(--brick)" stroke-width="2" fill="none"/>
        </pattern>
        <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffd98a" stop-opacity=".34"/>
          <stop offset="1" stop-color="#ffd98a" stop-opacity=".06"/>
        </linearGradient>
        <linearGradient id="discoCone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ff5fa2" stop-opacity=".35"/>
          <stop offset=".5" stop-color="#5fd0ff" stop-opacity=".25"/>
          <stop offset="1" stop-color="#ffe066" stop-opacity=".2"/>
        </linearGradient>
        <radialGradient id="pool">
          <stop offset="0" stop-color="#ffd98a" stop-opacity=".32"/>
          <stop offset="1" stop-color="#ffd98a" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="beamG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#b6ffcf" stop-opacity=".7"/>
          <stop offset="1" stop-color="#b6ffcf" stop-opacity=".15"/>
        </linearGradient>
      </defs>

      <g id="scene">
        <rect width="400" height="520" fill="url(#bricks)"/>
        <rect y="432" width="400" height="88" fill="var(--ground)"/>
        <path d="M0 432H400" stroke="#262f43" stroke-width="2"/>
        <g id="discoFloor">
          <rect x="0" y="434" width="50" height="43"/><rect x="50" y="434" width="50" height="43"/><rect x="100" y="434" width="50" height="43"/><rect x="150" y="434" width="50" height="43"/><rect x="200" y="434" width="50" height="43"/><rect x="250" y="434" width="50" height="43"/><rect x="300" y="434" width="50" height="43"/><rect x="350" y="434" width="50" height="43"/>
          <rect x="0" y="477" width="50" height="43"/><rect x="50" y="477" width="50" height="43"/><rect x="100" y="477" width="50" height="43"/><rect x="150" y="477" width="50" height="43"/><rect x="200" y="477" width="50" height="43"/><rect x="250" y="477" width="50" height="43"/><rect x="300" y="477" width="50" height="43"/><rect x="350" y="477" width="50" height="43"/>
        </g>

        <!-- wall shadow, cast right by the lamp -->
        <g transform="translate(118,58) skewX(-16)">
          <g transform="translate(200,0)" fill="#05070b" opacity=".38"><g id="shadowBody">
            <ellipse cx="0" cy="152" rx="60" ry="11"/>
            <path d="M-33,152 L-29,112 Q0,100 29,112 L33,152Z"/>
            <circle cx="0" cy="186" r="40"/>
            <path d="M-46,240 Q-56,330 -64,404 L64,404 Q56,330 46,240Z"/>
            <g id="shadowArm" opacity="0"><path d="M38,262 L70,180" stroke="#05070b" stroke-width="20" stroke-linecap="round"/><circle cx="72" cy="172" r="13"/></g>
          </g></g>
        </g>

        <!-- streetlamp -->
        <g>
          <rect x="56" y="70" width="10" height="364" fill="#2a3142"/>
          <rect x="50" y="424" width="22" height="10" fill="#2a3142"/>
          <path d="M61,76 Q61,50 92,50 L132,50" stroke="#2a3142" stroke-width="7" fill="none"/>
          <path d="M116,48 L162,48 L152,68 L126,68Z" fill="#363e52"/>
        </g>
        <g id="lightGroup">
          <polygon id="lightCone" points="128,70 150,70 342,436 -18,436" fill="url(#cone)"/>
          <ellipse cx="190" cy="436" rx="170" ry="24" fill="url(#pool)"/>
          <ellipse cx="139" cy="69" rx="12" ry="4" fill="var(--lamp)"/>
        </g>

        <!-- disco ball -->
        <g id="discoBall">
          <path d="M290 0V48" stroke="#9aa3b5" stroke-width="2"/>
          <circle cx="290" cy="70" r="22" fill="#cfd6e4" stroke="var(--ink)" stroke-width="3"/>
          <path d="M268 64H312M268 76H312M276 52Q290 70 276 88M290 48V92M304 52Q290 70 304 88" stroke="#8d97ab" stroke-width="1.5" fill="none"/>
          <circle cx="282" cy="62" r="4" fill="#fff"/>
        </g>

        <!-- UFO -->
        <g id="ufo">
          <polygon id="beam" points="178,96 222,96 300,440 100,440" fill="url(#beamG)"/>
          <ellipse cx="200" cy="66" rx="24" ry="20" fill="#bfe8ff" stroke="var(--ink)" stroke-width="3"/>
          <ellipse cx="200" cy="84" rx="64" ry="16" fill="#8d97ab" stroke="var(--ink)" stroke-width="3.5"/>
          <circle cx="166" cy="86" r="4" fill="#ffe066"/><circle cx="200" cy="90" r="4" fill="#ff5fa2"/><circle cx="234" cy="86" r="4" fill="#5fd0ff"/>
        </g>

        <g transform="translate(200,0)">
          <g id="abduct"><g id="flip"><g id="gerald">
            <ellipse cx="0" cy="437" rx="64" ry="9" fill="#000" opacity=".42"/>

            <!-- the twin, hiding behind him -->
            <g id="twin" class="prop">
              <ellipse class="o coat" cx="0" cy="262" rx="52" ry="46"/>
              <use href="#headArt"/>
            </g>

            <!-- the thing behind his back -->
            <g id="bag">
              <path class="o" d="M38,300 L64,293 L73,334 L47,341Z" fill="#c49a5a"/>
              <path d="M42,305 L63,299" stroke="var(--ink)" stroke-width="2"/>
            </g>

            <!-- legs -->
            <rect class="o trouser" x="-28" y="392" width="18" height="40"/>
            <rect class="o trouser" x="10" y="392" width="18" height="40"/>
            <ellipse class="o" cx="-23" cy="433" rx="17" ry="7" fill="#2a2320"/>
            <ellipse class="o" cx="23" cy="433" rx="17" ry="7" fill="#2a2320"/>

            <!-- sleeves bent behind the back -->
            <path d="M-42,262 Q-72,300 -52,346" stroke="var(--ink)" stroke-width="25" fill="none" stroke-linecap="round"/>
            <path class="sleeve" d="M-42,262 Q-72,300 -52,346" stroke="var(--coat)" stroke-width="18" fill="none" stroke-linecap="round"/>
            <path d="M42,262 Q72,300 52,346" stroke="var(--ink)" stroke-width="25" fill="none" stroke-linecap="round"/>
            <path class="sleeve" d="M42,262 Q72,300 52,346" stroke="var(--coat)" stroke-width="18" fill="none" stroke-linecap="round"/>

            <!-- trench coat -->
            <path class="o coat" d="M-46,246 Q-56,330 -64,404 Q0,414 64,404 Q56,330 46,246 Q0,234 -46,246Z"/>
            <path d="M2,256 L2,408" stroke="var(--ink)" stroke-width="3"/>
            <circle cx="-10" cy="292" r="3.5" fill="var(--ink)"/><circle cx="-10" cy="360" r="3.5" fill="var(--ink)"/>
            <rect class="o coatd" x="-58" y="322" width="116" height="12" rx="3"/>
            <rect x="-8" y="320" width="16" height="16" fill="none" stroke="var(--band)" stroke-width="3"/>

            <!-- nested heads (legendary) -->
            <g id="nest2" class="prop"><use href="#headArt" transform="translate(0,200) scale(.55) translate(0,-200)"/></g>
            <g id="nest1" class="prop"><use href="#headArt" transform="translate(0,196) scale(.76) translate(0,-196)"/></g>

            <!-- head -->
            <g id="head">
              <g id="headArt">
                <ellipse class="o skin" cx="-40" cy="190" rx="7" ry="10"/>
                <ellipse class="o skin" cx="40" cy="190" rx="7" ry="10"/>
                <circle class="o skin" cx="0" cy="186" r="40"/>
                <ellipse cx="0" cy="163" rx="40" ry="9" fill="#000" opacity=".2"/>
                <ellipse class="o" cx="-15" cy="180" rx="11" ry="9" fill="#fff"/>
                <ellipse class="o" cx="15" cy="180" rx="11" ry="9" fill="#fff"/>
                <g id="pupils"><circle cx="-15" cy="181" r="4.6" fill="var(--ink)"/><circle cx="15" cy="181" r="4.6" fill="var(--ink)"/></g>
                <g id="lids">
                  <rect class="skin" x="-28" y="169" width="26" height="9"/>
                  <rect class="skin" x="2" y="169" width="26" height="9"/>
                  <path d="M-26,178H-4M4,178H26" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/>
                </g>
                <path id="browL" d="M-28,164 L-5,171" stroke="var(--ink)" stroke-width="4.5" stroke-linecap="round"/>
                <path id="browR" d="M5,168 L27,158" stroke="var(--ink)" stroke-width="4.5" stroke-linecap="round"/>
                <ellipse class="o skind" cx="2" cy="198" rx="9" ry="7"/>
                <path id="sweat" d="M36,166 q6,9 0,13 q-6,-4 0,-13z" fill="#9fd4ff" stroke="var(--ink)" stroke-width="2" opacity="0"/>
                <!-- pigeon lives under the hat -->
                <g>
                  <ellipse cx="-2" cy="136" rx="21" ry="13" fill="#9aa0ab" stroke="var(--ink)" stroke-width="3"/>
                  <circle cx="15" cy="121" r="9" fill="#8a909c" stroke="var(--ink)" stroke-width="3"/>
                  <path d="M10,129 q6,4 12,0" stroke="#5fae8e" stroke-width="3" fill="none"/>
                  <circle cx="18" cy="119" r="2" fill="var(--ink)"/>
                  <path d="M23,121 l7,2 l-7,2z" fill="#e8a33c"/>
                </g>
                <g id="hat">
                  <path class="o hatf" d="M-33,152 L-29,112 Q-14,100 0,108 Q14,100 29,112 L33,152Z"/>
                  <rect x="-32" y="136" width="64" height="11" fill="var(--band)"/>
                  <ellipse class="o hatf" cx="0" cy="152" rx="60" ry="11"/>
                </g>
              </g>
            </g>

            <!-- turned-up collar hides the mouth -->
            <rect id="scarf" class="coatd" x="-30" y="206" width="60" height="50"/>
            <path class="o coat" d="M-52,254 L-34,197 L-6,256Z"/>
            <path class="o coat" d="M52,254 L34,197 L6,256Z"/>

            <!-- props -->
            <g id="tux" class="prop">
              <path d="M-6,256 L0,302 L6,256Z" fill="#f4f1ee"/>
              <path d="M-14,232 L0,238 L-14,244Z M14,232 L0,238 L14,244Z" fill="#111" stroke="#111" stroke-width="2" stroke-linejoin="round"/>
              <path d="M-30,300 Q-26,284 -22,270" stroke="#3c7d3a" stroke-width="3" fill="none"/>
              <circle cx="-22" cy="266" r="7" fill="#d8344a" stroke="var(--ink)" stroke-width="2.5"/>
            </g>
            <g id="grape" class="prop">
              <circle class="o skin" cx="0" cy="300" r="11"/>
              <circle cx="0" cy="287" r="8" fill="#7b4fa8" stroke="var(--ink)" stroke-width="2.5"/>
              <circle cx="-3" cy="284" r="2" fill="#fff" opacity=".7"/>
            </g>
            <g id="cake" class="prop">
              <path d="M-12,268V284M0,264V284M12,268V284" stroke="#fff" stroke-width="4"/>
              <path d="M-12,262q3,-6 0,-9q-3,3 0,9M0,258q3,-6 0,-9q-3,3 0,9M12,262q3,-6 0,-9q-3,3 0,9" fill="#ffb54a"/>
              <rect class="o" x="-44" y="284" width="88" height="44" rx="4" fill="#f6d6e0"/>
              <path d="M-44,296 q11,8 22,0 t22,0 t22,0 t22,0" stroke="#d86a92" stroke-width="3" fill="none"/>
              <text id="cakeText" x="0" y="318" text-anchor="middle" font-family="Patrick Hand, cursive" font-size="13" fill="#7a2e4a">you</text>
              <circle class="o skin" cx="-48" cy="314" r="9"/><circle class="o skin" cx="48" cy="314" r="9"/>
            </g>
            <g id="violin" class="prop">
              <path d="M-58,236 q-14,-4 -12,10 q-10,6 -2,14 q4,10 16,2 q14,4 10,-10 q8,-10 -12,-16z" fill="#a0522d" stroke="var(--ink)" stroke-width="2.5"/>
              <path d="M-46,240 L-22,214" stroke="var(--ink)" stroke-width="4"/>
              <path d="M-86,226 L-24,262" stroke="#d8c8a8" stroke-width="2.5"/>
              <circle class="o skin" cx="-30" cy="250" r="8"/>
            </g>
            <g id="mic" class="prop">
              <path d="M-16,264 L-6,238" stroke="#3a3f4c" stroke-width="5" stroke-linecap="round"/>
              <circle cx="-4" cy="231" r="9" fill="#9aa3b5" stroke="var(--ink)" stroke-width="2.5"/>
              <path d="M-11,228H3M-11,234H3" stroke="#6c7487" stroke-width="1.5"/>
              <circle class="o skin" cx="-17" cy="266" r="8"/>
            </g>
          </g></g></g>

          <!-- secret: three people in a coat (belt click) -->
          <g id="trio" class="prop">
            <path class="o coat" d="M-46,246 Q-96,250 -124,268 L-118,402 Q-90,408 -62,404 Q-54,330 -46,246Z"/>
            <path d="M-50,256 Q-92,262 -112,276 L-108,394 Q-88,398 -66,396Z" fill="#6b5a42"/>
            <path class="o coat" d="M46,246 Q96,250 124,268 L118,402 Q90,408 62,404 Q54,330 46,246Z"/>
            <path d="M50,256 Q92,262 112,276 L108,394 Q88,398 66,396Z" fill="#6b5a42"/>
            <rect class="o trouser" x="-28" y="392" width="18" height="40"/><rect class="o trouser" x="10" y="392" width="18" height="40"/>
            <ellipse class="o" cx="-23" cy="433" rx="17" ry="7" fill="#2a2320"/><ellipse class="o" cx="23" cy="433" rx="17" ry="7" fill="#2a2320"/>
            <rect class="o" x="-26" y="364" width="52" height="32" rx="7" fill="#5b7bb5"/>
            <path d="M-22,372 L-30,340 M22,372 L30,340" stroke="var(--ink)" stroke-width="9" stroke-linecap="round"/>
            <path d="M-22,372 L-30,340 M22,372 L30,340" stroke="#5b7bb5" stroke-width="5" stroke-linecap="round"/>
            <circle class="o skin" cx="0" cy="350" r="15"/>
            <circle cx="-6" cy="347" r="4.5" fill="none" stroke="var(--ink)" stroke-width="2"/><circle cx="6" cy="347" r="4.5" fill="none" stroke="var(--ink)" stroke-width="2"/>
            <path d="M-5,358 q5,-3 10,0" stroke="var(--ink)" stroke-width="2" fill="none"/>
            <rect class="o trouser" x="-30" y="322" width="11" height="26" rx="4"/><rect class="o trouser" x="19" y="322" width="11" height="26" rx="4"/>
            <rect class="o" x="-23" y="288" width="46" height="42" rx="7" fill="#c0504d"/>
            <circle class="o skin" cx="0" cy="274" r="15"/>
            <path d="M-12,264 q6,-10 14,-6 q6,-6 10,4" stroke="var(--ink)" stroke-width="3" fill="#3d2618"/>
            <circle cx="-5" cy="273" r="2.2" fill="var(--ink)"/><circle cx="5" cy="273" r="2.2" fill="var(--ink)"/>
            <ellipse cx="0" cy="281" rx="3" ry="2.5" fill="var(--ink)"/>
            <rect class="o trouser" x="-27" y="246" width="10" height="26" rx="4"/><rect class="o trouser" x="17" y="246" width="10" height="26" rx="4"/>
            <rect class="o coatd" x="-21" y="218" width="42" height="40" rx="7"/>
            <use href="#headArt"/>
          </g>

          <!-- three ferrets in a coat -->
          <g id="ferrets" class="prop">
            <g transform="translate(-4,0)"><ellipse class="o" cx="0" cy="404" rx="30" ry="26" fill="#8b5a3c"/><ellipse cx="0" cy="398" rx="22" ry="7" fill="#3d2618"/><circle cx="-9" cy="398" r="3.5" fill="#fff"/><circle cx="9" cy="398" r="3.5" fill="#fff"/><ellipse cx="0" cy="410" rx="4" ry="3" fill="#e79aa6"/></g>
            <g transform="translate(7,0)"><ellipse class="o" cx="0" cy="354" rx="28" ry="25" fill="#9a6644"/><ellipse cx="0" cy="348" rx="21" ry="7" fill="#3d2618"/><circle cx="-8" cy="348" r="3.5" fill="#fff"/><circle cx="8" cy="348" r="3.5" fill="#fff"/><ellipse cx="0" cy="360" rx="4" ry="3" fill="#e79aa6"/></g>
            <g transform="translate(-2,0)"><circle class="o" cx="-20" cy="290" r="7" fill="#8b5a3c"/><circle class="o" cx="20" cy="290" r="7" fill="#8b5a3c"/><ellipse class="o" cx="0" cy="306" rx="27" ry="24" fill="#8b5a3c"/><ellipse cx="0" cy="300" rx="20" ry="7" fill="#3d2618"/><circle cx="-8" cy="300" r="3.5" fill="#fff"/><circle cx="8" cy="300" r="3.5" fill="#fff"/><ellipse cx="0" cy="312" rx="4" ry="3" fill="#e79aa6"/>
              <path class="o hatf" d="M-20,286 L-17,262 Q0,254 17,262 L20,286Z"/><ellipse class="o hatf" cx="0" cy="286" rx="34" ry="7"/></g>
          </g>
        </g>

        <rect id="hit" x="105" y="95" width="190" height="350" fill="transparent"/>
        <rect id="dark" width="400" height="520" fill="#000" opacity="0" pointer-events="none"/>
      </g>
    </svg>
    <div class="bubble" id="bubble"></div>
    <a class="slip" id="slip" href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank" rel="noopener noreferrer"><small>psst. take this.</small><br><u id="slipLabel">totally-normal-video.link</u></a>
    <div class="gone" id="goneMsg" aria-live="polite">Gerald has left the website.<small>There is nothing to see here.</small></div>
    <div class="toast" id="toast"></div>
  </div>

  <div class="foot">
    <span class="me" id="meText">&nbsp;</span>
    <span style="display:inline-flex;gap:12px;align-items:center;flex-wrap:wrap">
    <button class="ghost" id="mute" type="button" aria-pressed="false">Sound on</button>
    </span>
  </div>
</div>

<div class="sheet" id="reveal" role="dialog" aria-live="polite">
  <span class="chip" id="rvChip">Small oddity</span>
  <h2 id="rvTitle"></h2>
  <p id="rvBlurb"></p>
  <p class="odds" id="rvOdds"></p>
  <p class="rarity" id="rvRarity"></p>
  <textarea class="share-text" id="rvShare" rows="3" readonly aria-label="Share text"></textarea>
  <div class="row">
    <button class="btn" id="rvCopy" type="button">Share</button>
    <button class="btn alt" id="rvClose" type="button">Back to Gerald</button>
  </div>
</div>

<div class="dossier" id="dossier" aria-hidden="true">
  <div class="file">
    <h3>CASE FILE 0001 · GERALD</h3>
    <dl>
      <dt>Suspect</dt><dd>Gerald</dd>
      <dt>Charge</dt><dd>Everything</dd>
      <dt>Motive</dt><dd>Unclear. Possibly snacks.</dd>
      <dt>Witnesses</dt><dd id="dsWitness">1</dd>
    </dl>
    <div class="stamp">CASE CLOSED</div>
  </div>
</div>

<div class="panel" id="panel" role="dialog" aria-label="Sightings">
  <div class="inner">
    <header>
      <div>
        <h2>Sightings</h2>
        <p class="sub" id="panelSub"></p>
      </div>
      <button class="ghost" id="closeSightings" type="button">Close</button>
    </header>
    <div id="tiers"></div>
    <p class="note">Small oddities and bigger moments roll when you arrive, and again every 30 seconds you stay. Legendary moments only happen on world milestones: whoever makes the 50,000th visit to the site sees the next one. Every minute or two he slips you a link. Poking Gerald just makes a noise. Secrets are hidden in Gerald himself: find the right spot to click. Preview plays a moment without logging it as seen.</p>
  </div>
</div>`;
