import { useState } from 'react'
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
      <div className='math_'>
        <TeX math="\int\limits_{a}^{b} sin(x)\, dx = {L}" />
      </div>
      <div className='math_result'>
        <div className='result' id='AB'>
          <p><TeX math="{a} = " /> <input className='inputNum' type="number" onChange={(e) => { set_a(parseFloat(e.target.value)); }}></input></p>
          <p><TeX math="{b} = " /> <input className='inputNum' type="number" onChange={(e) => { set_b(parseFloat(e.target.value)); }}></input></p>
        </div>
        <div className='result'>
          <p><TeX math="{L} = " /> {L} <span><button onClick={() => { let l_val = inte_sin(b, a); l_val.then((val) => { set_L(Math.round(val*10000)/10000) }) }}>calculate</button></span></p>
        </div>
      </div>
    </>
  )
}

export default App
