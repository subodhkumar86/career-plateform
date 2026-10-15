"use client";
import { useEffect,useState } from "react";
import { useParams } from "next/navigation";
import { api } from "../../../../lib/api";
export default function ResumePreview(){const params=useParams<{id:string}>();const [resume,setResume]=useState<any>(null);const [error,setError]=useState("");
useEffect(()=>{api<any>(`/resumes/${params.id}`).then(r=>setResume(r.resume)).catch(e=>setError(e.message))},[params.id]);
if(error)return <main className="shell"><p className="error">{error}</p></main>;if(!resume)return <main className="shell">Loading resume…</main>;
const c=resume.content||{};return <main className="shell"><div className="row"><h1>Resume preview</h1><button className="btn" onClick={()=>window.print()}>Print / Save PDF</button></div><article className="card" style={{maxWidth:800,margin:"auto",padding:40}}><h1>{c.personalInfo?.name||"Your Name"}</h1><p>{[c.personalInfo?.email,c.personalInfo?.phone,c.personalInfo?.location].filter(Boolean).join(" · ")}</p>{c.summary&&<section><h2>Professional Summary</h2><p>{c.summary}</p></section>}{["experience","education","projects","certifications","skills","achievements"].map(key=>{const val=c[key];if(!val?.length)return null;return <section key={key}><h2 style={{textTransform:"capitalize"}}>{key}</h2>{key==="skills"||key==="achievements"?<p>{val.join(", ")}</p>:val.map((x:any,i:number)=><div key={i}><strong>{x.title||x.name||x.school||x.company||x.degree||x.issuer}</strong><p>{x.description||x.details||x.bullets?.join(" • ")||x.technologies?.join(", ")}</p></div>)}</section>})}</article></main>}
