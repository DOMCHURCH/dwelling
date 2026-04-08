export default function CityscapeSilhouette({ backRef, frontRef }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      height: '38%',
      pointerEvents: 'none',
    }}>
      <svg
        viewBox="0 0 1440 320"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        {/* Back row — shorter, lighter buildings for depth */}
        <g ref={backRef} fill="#0d1e35">
          <rect x="0"    y="210" width="40"  height="110" />
          <rect x="42"   y="230" width="28"  height="90"  />
          <rect x="72"   y="195" width="50"  height="125" />
          <rect x="124"  y="220" width="32"  height="100" />
          <rect x="158"  y="200" width="60"  height="120" />
          <rect x="220"  y="215" width="35"  height="105" />
          <rect x="257"  y="185" width="55"  height="135" />
          <rect x="314"  y="210" width="40"  height="110" />
          <rect x="356"  y="200" width="48"  height="120" />
          <rect x="406"  y="220" width="30"  height="100" />
          <rect x="438"  y="190" width="62"  height="130" />
          <rect x="502"  y="215" width="38"  height="105" />
          <rect x="542"  y="200" width="44"  height="120" />
          <rect x="588"  y="210" width="50"  height="110" />
          <rect x="640"  y="185" width="58"  height="135" />
          <rect x="700"  y="215" width="34"  height="105" />
          <rect x="736"  y="195" width="52"  height="125" />
          <rect x="790"  y="210" width="40"  height="110" />
          <rect x="832"  y="200" width="48"  height="120" />
          <rect x="882"  y="220" width="30"  height="100" />
          <rect x="914"  y="190" width="60"  height="130" />
          <rect x="976"  y="215" width="36"  height="105" />
          <rect x="1014" y="200" width="44"  height="120" />
          <rect x="1060" y="210" width="50"  height="110" />
          <rect x="1112" y="185" width="56"  height="135" />
          <rect x="1170" y="215" width="34"  height="105" />
          <rect x="1206" y="195" width="52"  height="125" />
          <rect x="1260" y="210" width="40"  height="110" />
          <rect x="1302" y="200" width="48"  height="120" />
          <rect x="1352" y="220" width="30"  height="100" />
          <rect x="1384" y="190" width="56"  height="130" />
        </g>

        {/* Front row — taller, solid black buildings */}
        <g ref={frontRef} fill="#000">
          <rect x="0"   y="240" width="55"  height="80"  />
          <rect x="57"  y="220" width="38"  height="100" />
          <rect x="97"  y="250" width="25"  height="70"  />
          <rect x="124" y="180" width="48"  height="140" />
          <rect x="144" y="120" width="8"   height="60"  />
          <rect x="140" y="148" width="16"  height="12"  />
          <rect x="137" y="158" width="22"  height="8"   />
          <rect x="174" y="195" width="62"  height="125" />
          <rect x="238" y="210" width="44"  height="110" />
          <rect x="284" y="170" width="70"  height="150" />
          <rect x="356" y="200" width="52"  height="120" />
          <rect x="410" y="215" width="36"  height="105" />
          <rect x="448" y="140" width="80"  height="180" />
          <rect x="484" y="100" width="6"   height="42"  />
          <rect x="480" y="128" width="14"  height="8"   />
          <rect x="530" y="185" width="55"  height="135" />
          <rect x="587" y="200" width="42"  height="120" />
          <rect x="631" y="175" width="68"  height="145" />
          <rect x="701" y="195" width="58"  height="125" />
          <rect x="761" y="210" width="44"  height="110" />
          <rect x="807" y="180" width="72"  height="140" />
          <rect x="839" y="135" width="7"   height="47"  />
          <rect x="881" y="200" width="50"  height="120" />
          <rect x="933" y="215" width="38"  height="105" />
          <rect x="973" y="170" width="66"  height="150" />
          <rect x="1041" y="190" width="54" height="130" />
          <rect x="1097" y="210" width="40" height="110" />
          <rect x="1139" y="178" width="70" height="142" />
          <rect x="1169" y="140" width="8"  height="40"  />
          <rect x="1165" y="162" width="16" height="8"   />
          <rect x="1211" y="198" width="56" height="122" />
          <rect x="1269" y="212" width="42" height="108" />
          <rect x="1313" y="182" width="68" height="138" />
          <rect x="1383" y="200" width="57" height="120" />
          <rect x="0" y="295" width="1440" height="25" />
        </g>

        {/* Window lights */}
        <g fill="rgba(255,220,120,0.25)">
          <rect x="130" y="190" width="3" height="3" />
          <rect x="138" y="190" width="3" height="3" />
          <rect x="130" y="200" width="3" height="3" />
          <rect x="180" y="205" width="3" height="3" />
          <rect x="190" y="215" width="3" height="3" />
          <rect x="295" y="182" width="3" height="3" />
          <rect x="305" y="192" width="3" height="3" />
          <rect x="315" y="182" width="3" height="3" />
          <rect x="458" y="152" width="3" height="3" />
          <rect x="468" y="162" width="3" height="3" />
          <rect x="478" y="152" width="3" height="3" />
          <rect x="458" y="172" width="3" height="3" />
          <rect x="478" y="172" width="3" height="3" />
          <rect x="540" y="195" width="3" height="3" />
          <rect x="550" y="205" width="3" height="3" />
          <rect x="642" y="185" width="3" height="3" />
          <rect x="652" y="195" width="3" height="3" />
          <rect x="662" y="185" width="3" height="3" />
          <rect x="712" y="205" width="3" height="3" />
          <rect x="722" y="215" width="3" height="3" />
          <rect x="818" y="190" width="3" height="3" />
          <rect x="828" y="200" width="3" height="3" />
          <rect x="838" y="190" width="3" height="3" />
          <rect x="984" y="180" width="3" height="3" />
          <rect x="994" y="190" width="3" height="3" />
          <rect x="1004" y="180" width="3" height="3" />
          <rect x="1150" y="188" width="3" height="3" />
          <rect x="1160" y="198" width="3" height="3" />
          <rect x="1170" y="188" width="3" height="3" />
          <rect x="1220" y="208" width="3" height="3" />
          <rect x="1320" y="192" width="3" height="3" />
          <rect x="1330" y="202" width="3" height="3" />
        </g>

        <defs>
          <linearGradient id="skyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#0a1628" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#050c18" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="groundFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="1440" height="320" fill="url(#skyGradient)" />
        <rect x="0" y="100" width="1440" height="220" fill="url(#groundFade)" />
      </svg>
    </div>
  )
}
