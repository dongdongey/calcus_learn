import { useEffect, useRef, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import 'katex/dist/katex.min.css';
import TeX from '@matejmazur/react-katex';
import { invoke } from '@tauri-apps/api'

async function inte_sin(to: number, from: number) {
  return await invoke<number>('inte_sin', { to: to, from :from})
}


function App() {
  let [L, set_L] = useState(0.0);
  let [a, set_a] = useState(0.0);
  let [b, set_b] = useState(0.0);

  return (
    <>
      <Screan from={a} to={b} />
      <div className='math_'>
        <TeX math="\int\limits_{a}^{b} sin(x)\, dx = {L}" />
      </div>
      <div className='math_result'>
        <div className='result' id='AB'>
          <p><TeX math="{a} = " /> <input className='inputNum' type="number" onChange={(e) => { set_a(parseFloat(e.target.value)); }}></input></p>
          <p><TeX math="{b} = " /> <input className='inputNum' type="number" onChange={(e) => { set_b(parseFloat(e.target.value)); }}></input></p>
        </div>
        <div className='result'>
          <p><TeX math="{L} = " /> {L} <span><button onClick={async () => { let l_val = await inte_sin(b, a);  set_L(Math.round(l_val*1000000)/1000000)  }}>calculate</button></span></p>
        </div>
      </div>
    </>
  )
}



function Screan(props:{from:number, to:number}): JSX.Element {
  let canvasRef = useRef<HTMLCanvasElement | null>(null);

  

  const createShader = (gl: WebGLRenderingContext, type: GLenum, source: string): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;
  
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
      return shader;
    }
  
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  };
  
  const createProgram = (gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null => {
    const program = gl.createProgram();
    if (!program) return null;
  
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
  
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
      return program;
    }
  
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  };

  function drawGrid(gl: WebGLRenderingContext, program: WebGLProgram) {
    const gridLines = [];
    const step = 0.5; // 그리드 간격
  
    // 수평선 그리기 (y 값은 [-1, 1] 범위)
    for (let y = -1; y <= 1; y += step) {
      gridLines.push(-1, y); // 왼쪽 끝에서
      gridLines.push(1, y);  // 오른쪽 끝까지
    }
  
    // 수직선 그리기 (x 값은 [-1, 1] 범위)
    for (let x = -1; x <= 1; x += step) {
      gridLines.push(x, -1); // 아래쪽 끝에서
      gridLines.push(x, 1);  // 위쪽 끝까지
    }
  
    // 버퍼에 그리드 데이터를 업로드
    const gridBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gridLines), gl.STATIC_DRAW);
  
    // 그리기 설정
    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
  
    // 그리드 그리기
    gl.drawArrays(gl.LINES, 0, gridLines.length / 2);
  }

  function drawSinCurve(gl: WebGLRenderingContext, program: WebGLProgram) {
    const positions = [];
    const step = 0.01; // x축의 스텝 값, 곡선의 정밀도를 조정
  
    // [-π, π] 범위에서 sin 곡선 생성
    for (let x = -Math.PI; x <= Math.PI; x += step) {
      positions.push(x / Math.PI);           // x 좌표 정규화 [-1, 1]
      positions.push(Math.sin(x));           // y 좌표는 sin(x)
    }
  
    // 버퍼 생성 및 데이터 설정
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  
    // WebGL에 그리기 설정
    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
  
    // sin 곡선 그리기
    gl.drawArrays(gl.LINE_STRIP, 0, positions.length / 2);
  }
  

  function drawIntegralArea(gl: WebGLRenderingContext, program: WebGLProgram, a: number, b: number) {
    const areaVertices = [];
    const step = 0.01; // 적분 구간을 더 세밀하게 하기 위한 작은 스텝
  
    // 적분 영역의 다각형 생성 (a부터 b까지)
    for (let x = a; x <= b; x += step) {
      areaVertices.push(x / Math.PI);         // x 좌표 정규화 [-1, 1]
      areaVertices.push(0);                   // 아래쪽 (x축)
      areaVertices.push(x / Math.PI);         // x 좌표 정규화 [-1, 1]
      areaVertices.push(Math.sin(x));         // sin 곡선 위
    }
  
    // 버퍼에 적분 영역 데이터를 업로드
    const areaBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, areaBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(areaVertices), gl.STATIC_DRAW);
  
    // 그리기 설정
    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, areaBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
  
    // 적분 영역 그리기 (삼각형 스트립으로 그리기)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, areaVertices.length / 2);
  }


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    // WebGL 뷰포트 설정 (렌더링 크기와 동기화)
    gl.viewport(10, 10, canvas.width - 20, canvas.height - 20);


    // WebGL 초기화 코드
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const vertexShaderSource = `
    attribute vec4 a_position;
    void main(void) {
      gl_Position = a_position;
    }
  `;

  const fragmentShaderSource = `
    void main(void) {
      gl_FragColor = vec4(0.5, 0.5, 0.5, 1.0); // 회색
    }
  `;

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vertexShader || !fragmentShader) return;

  const program = createProgram(gl, vertexShader, fragmentShader);
  if (!program) return;

  // 버퍼 생성 및 정점 데이터 설정
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  let positions:number[] = [];
  
  for (let x = -Math.PI; x <= Math.PI; x += 0.1) {
    positions.push(x / Math.PI); // x 값을 [-1, 1] 범위로 정규화
    positions.push(Math.sin(x)); // sin 함수 값 계산
  }
  
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // 그리기 설정
  gl.useProgram(program);
  // 그리드 그리기
  drawGrid(gl, program);

  // sin 곡선 그리기
  drawSinCurve(gl, program);

  // 적분 영역 그리기 (a = -π/2, b = π/2)
  drawIntegralArea(gl, program, props.from, props.to);

  }, [props.from, props.to]);

  return (
    <canvas ref={canvasRef} width={471} height = {150} style = {{ margin: "10px" }}></canvas>
  )
}

export default App
