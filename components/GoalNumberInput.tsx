'use client';
import {useEffect,useRef,useState,type InputHTMLAttributes} from 'react';
/** Keep an empty editing draft without converting it back to zero on each key. */
export function GoalNumberInput({value,onValueChange,...props}:Omit<InputHTMLAttributes<HTMLInputElement>,'value'|'onChange'|'type'> & {value:number;onValueChange:(value:number)=>void}){
 const ref=useRef<HTMLInputElement>(null),[draft,setDraft]=useState(String(value));
 useEffect(()=>{if(document.activeElement!==ref.current)setDraft(String(value));},[value]);
 return <input {...props} ref={ref} type="number" value={draft} onChange={e=>{const raw=e.target.value;setDraft(raw);if(raw!==''&&Number.isFinite(Number(raw)))onValueChange(Number(raw));}} onBlur={e=>{if(e.target.value!=='')setDraft(String(Number(e.target.value)));props.onBlur?.(e);}}/>;
}
