gsap.registerPlugin(ScrollTrigger);
document.documentElement.classList.add('js-ready');
const qs = s => document.querySelector(s);
const qsa = s => document.querySelectorAll(s);

/* Detect mobile / touch — disable heavy 3D + custom cursor there */
const isMobile = window.matchMedia('(max-width: 768px)').matches
              || ('ontouchstart' in window);

/* ── Cursor (desktop only) ───────────────────────── */
const cd = qs('#cur-d'), cr = qs('#cur-r');
if(isMobile){
  if(cd) cd.style.display='none';
  if(cr) cr.style.display='none';
}else{
  let mx=innerWidth/2, my=innerHeight/2, rx=mx, ry=my;
  document.addEventListener('mousemove', e=>{mx=e.clientX;my=e.clientY});

  qsa('a,button,.meth-card').forEach(el=>{
    el.addEventListener('mouseenter',()=>document.body.classList.add('c-hover'));
    el.addEventListener('mouseleave',()=>document.body.classList.remove('c-hover'));
  });

  (function loop(){
    cd.style.left=mx+'px'; cd.style.top=my+'px';
    rx+=(mx-rx)*.1; ry+=(my-ry)*.1;
    cr.style.left=rx+'px'; cr.style.top=ry+'px';
    requestAnimationFrame(loop);
  })();
}

/* ── Loader ──────────────────────────────────────── */
const lpct=qs('#lpct'), lbf=qs('#lbf');
let p=0;
const iv=setInterval(()=>{
  p+=Math.random()*10+3;
  if(p>=100){p=100;clearInterval(iv);setTimeout(launchSite,600)}
  lpct.textContent=Math.floor(p)+'%';
  lbf.style.width=p+'%';
},90);

function launchSite(){
  const tl=gsap.timeline();
  tl.to('#loader',{yPercent:-100,duration:1.2,ease:'power3.inOut'})
    .call(initHero,[],'-=0.4');
  setTimeout(()=>{qs('#loader').style.display='none'},1400);
}

/* ── Hero init ───────────────────────────────────── */
function initHero(){
  // Reveal mountain SVG
  const hm=qs('#hero-mountain');
  gsap.to(hm,{opacity:1,duration:.1});

  // Animate hero mountain paths
  const outline=qs('#hm-outline');
  const snow=qs('#hm-snow');
  const hornli=qs('#hm-hornli');
  const zmutt=qs('#hm-zmutt');
  const summit=qs('#hm-summit');
  const pulse=qs('#hm-pulse');
  const contours=qsa('.hm-contour');

  const mt=gsap.timeline({defaults:{ease:'power2.out'}});
  mt
    .to(outline,{strokeDashoffset:0,duration:2.4,ease:'power1.inOut'},'0')
    .to(snow,{strokeDashoffset:0,duration:1.1,ease:'power2.out'},'1.0')
    .to(hornli,{strokeDashoffset:0,duration:1.3,ease:'power2.out'},'1.2')
    .to(zmutt,{strokeDashoffset:0,duration:1.1,ease:'power2.out'},'1.3');

  contours.forEach((c,i)=>{
    mt.to(c,{strokeDashoffset:0,duration:1.6,ease:'power1.out'},1.2+i*.12);
  });

  mt.to(summit,{opacity:1,duration:.5},'2.2')
    .to(pulse,{opacity:.6,duration:.3},'2.4')
    .to(pulse,{attr:{r:28},opacity:0,duration:1.5,ease:'power2.out'},'2.4');

  // Hero text - letter by letter
  function buildLetters(id,text){
    const el=qs('#'+id);
    el.innerHTML=text.split('').map(c=>`<span>${c==' '?'&nbsp;':c}</span>`).join('');
  }
  buildLetters('hr1','ELIAS');
  buildLetters('hr2','POLION');

  const htl=gsap.timeline({defaults:{ease:'power4.out'}});
  htl.delay(.4)
    .to('.hero-label',{opacity:1,y:0,duration:.7},'0')
    .from('#hr1 span',{y:'110%',stagger:.07,duration:.8},'0.3')
    .from('#hr2 span',{y:'110%',stagger:.07,duration:.8},'0.5')
    .to('.hero-sub',{opacity:1,duration:.7},'0.9')
    .to('.hero-ctas',{opacity:1,duration:.6},'1.05')
    .to('.hero-scroll',{opacity:1,duration:.5},'1.5');

  // continuous summit pulse loop
  setTimeout(()=>{
    gsap.to('#hm-pulse',{
      attr:{r:16},opacity:.3,
      duration:2,ease:'power1.out',
      repeat:-1,yoyo:false,
      onRepeat:function(){
        gsap.set('#hm-pulse',{attr:{r:3.5},opacity:.15});
      }
    });
  },3000);
}

/* ── Nav state ───────────────────────────────────── */
const lightSections=['#identity'];
ScrollTrigger.create({
  start:'top -60',end:99999,
  onUpdate(self){
    const nav=qs('#nav');
    if(self.progress>0) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
});
// Dark/light nav toggle
lightSections.forEach(sel=>{
  ScrollTrigger.create({
    trigger:sel,start:'top 60px',end:'bottom 60px',
    onEnter:()=>qs('#nav').classList.add('on-white'),
    onLeave:()=>qs('#nav').classList.remove('on-white'),
    onEnterBack:()=>qs('#nav').classList.add('on-white'),
    onLeaveBack:()=>qs('#nav').classList.remove('on-white'),
  });
});
// Cursor inversion on white sections
lightSections.forEach(sel=>{
  ScrollTrigger.create({
    trigger:sel,start:'top center',end:'bottom center',
    onEnter:()=>document.body.classList.add('c-dark'),
    onLeave:()=>document.body.classList.remove('c-dark'),
    onEnterBack:()=>document.body.classList.add('c-dark'),
    onLeaveBack:()=>document.body.classList.remove('c-dark'),
  });
});

/* ── Scroll bar ──────────────────────────────────── */
ScrollTrigger.create({
  start:'top top',end:'bottom bottom',
  onUpdate:self=>{ qs('#spf').style.height=(self.progress*100)+'%'; }
});

/* ── Hero video + mountain parallax ─────────────── */
gsap.to('.hero-vid video',{
  yPercent:28,ease:'none',
  scrollTrigger:{trigger:'#hero',start:'top top',end:'bottom top',scrub:true}
});
gsap.to('.hero-mountain-wrap',{
  yPercent:18,ease:'none',
  scrollTrigger:{trigger:'#hero',start:'top top',end:'bottom top',scrub:true}
});
gsap.to('.hero-content',{
  yPercent:12,ease:'none',
  scrollTrigger:{trigger:'#hero',start:'top top',end:'bottom top',scrub:true}
});

/* ── Generic will-reveal items ───────────────────── */
qsa('.will-reveal').forEach(el=>{
  gsap.to(el,{
    y:0,opacity:1,duration:.95,ease:'power3.out',
    scrollTrigger:{trigger:el,start:'top 88%',toggleActions:'play none none none'}
  });
});

/* ── Stats counters ──────────────────────────────── */
ScrollTrigger.create({
  trigger:'.id-stats',start:'top 80%',once:true,
  onEnter:()=>{
    qsa('.id-stat-val').forEach(el=>{
      const t=+el.dataset.t;
      const sv=el.querySelector('.sv');
      gsap.to({v:0},{v:t,duration:t>100?2.5:2,ease:'power2.out',
        onUpdate(){sv.textContent=Math.round(this.targets()[0].v).toLocaleString();}
      });
    });
  }
});

/* ── Method cards sequential 3D ─────────────────── */
['#mc1','#mc2','#mc3'].forEach((id,i)=>{
  gsap.to(id,{
    y:0,opacity:1,duration:1,ease:'back.out(1.1)',
    delay:i*.15,
    scrollTrigger:{trigger:'.meth-grid',start:'top 76%',toggleActions:'play none none none'}
  });
});
// 3D hover tilt (desktop only)
if(!isMobile){
  qsa('.meth-card').forEach(c=>{
    c.addEventListener('mousemove',e=>{
      const r=c.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5;
      const y=(e.clientY-r.top)/r.height-.5;
      gsap.to(c,{rotateY:x*12,rotateX:-y*8,
        transformPerspective:900,ease:'power1.out',duration:.35});
    });
    c.addEventListener('mouseleave',()=>{
      gsap.to(c,{rotateY:0,rotateX:0,duration:.6,ease:'power2.out'});
    });
  });
}

/* ── Mountain: continuous breathing float ────────── */
gsap.to('#hero-mountain',{
  y:-18, duration:5, ease:'sine.inOut',
  repeat:-1, yoyo:true
});

/* ── Mountain: mouse parallax (desktop only) ─────── */
if(!isMobile){
  let mmx=0,mmy=0;
  document.addEventListener('mousemove',e=>{
    mmx=(e.clientX/innerWidth-.5)*18;
    mmy=(e.clientY/innerHeight-.5)*8;
  });
  (function mtLoop(){
    const hm=qs('#hero-mountain');
    if(!hm) return;
    const curX=parseFloat(hm.dataset.mx||0);
    const curY=parseFloat(hm.dataset.my||0);
    const nx=curX+(mmx-curX)*.04;
    const ny=curY+(mmy-curY)*.04;
    hm.dataset.mx=nx; hm.dataset.my=ny;
    gsap.set('.hero-mountain-wrap',{x:nx,y:ny});
    requestAnimationFrame(mtLoop);
  })();
}

/* ── Contour lines: slow draw loop on scroll-in ──── */
ScrollTrigger.create({
  trigger:'#hero', start:'top top', end:'bottom top',
  onEnter:()=>{
    // staggered opacity pulse on contour lines
    gsap.to('.hm-contour',{
      opacity:(i)=>[.10,.12,.14,.12,.10,.08,.06][i]||.06,
      stagger:{each:.15,yoyo:true,repeat:-1,ease:'sine.inOut'},
      duration:3
    });
  }
});

/* ── Nav footer link cleanup ──────────────────────── */

/* ── Nav hide/show on scroll ─────────────────────── */
ScrollTrigger.create({
  start:'top -80',end:99999,
  onUpdate(self){
    const v=self.getVelocity();
    if(v>220) gsap.to('#nav',{y:-100,duration:.3,ease:'power2.in'});
    else if(v<-100) gsap.to('#nav',{y:0,duration:.4,ease:'power2.out'});
  }
});

/* ── Form submit (Web3Forms) ─────────────────────── */
const ctForm = qs('#ctForm');
const ctBtn  = qs('#ctBtn');

ctForm.addEventListener('submit', async function(e){
  e.preventDefault();

  // Validate
  const inputs = qsa('#contact .ct-field input, #contact .ct-field textarea');
  let valid = true;
  inputs.forEach(i=>{ if(!i.value.trim()) valid = false; });
  const emailInput = qsa('#contact .ct-field input[type=email]')[0];
  if(emailInput && emailInput.value.trim() &&
     !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) valid = false;

  if(!valid){
    ctBtn.textContent = 'Please fill the form first';
    ctBtn.style.color = 'var(--white)';
    setTimeout(()=>{ ctBtn.textContent = 'Send Message'; ctBtn.style.color = ''; }, 2500);
    return;
  }

  // Sending state
  ctBtn.textContent = 'Sending…';
  ctBtn.style.color = 'var(--white)';
  ctBtn.disabled = true;

  try{
    const formData = new FormData(ctForm);
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if(data.success){
      ctBtn.textContent = 'Message sent — I\'ll be in touch ✓';
      ctForm.reset();
    } else {
      ctBtn.textContent = 'Something went wrong — try again';
      console.error(data);
    }
  } catch(err){
    ctBtn.textContent = 'Network error — try again';
    console.error(err);
  } finally {
    setTimeout(()=>{
      ctBtn.textContent = 'Send Message';
      ctBtn.style.color = '';
      ctBtn.disabled = false;
    }, 4000);
  }
});

/* ── Refresh after fonts ─────────────────────────── */
document.fonts.ready.then(()=>ScrollTrigger.refresh());

/* ═══════════════════════════════════════════════════
   SCROLL MOTIONS — 3D on desktop, simple fades on mobile
   (toggleActions never "reverse" so content never re-hides)
═══════════════════════════════════════════════════ */

if(isMobile){
  /* ---- MOBILE: lightweight fade-up reveals only ---- */
  const fadeUp = (sel,opts={})=>{
    gsap.utils.toArray(sel).forEach((el,i)=>{
      gsap.from(el,{
        y:30, opacity:0, duration:.8, ease:'power2.out',
        delay:(opts.stagger||0)*i,
        scrollTrigger:{trigger:opts.trigger||el,start:'top 90%',toggleActions:'play none none none'}
      });
    });
  };
  fadeUp('.meth-card',{trigger:'.meth-grid',stagger:.12});
  fadeUp('#contact .contact-inner > div',{stagger:.1});
  fadeUp('.ct-field',{trigger:'.ct-form',stagger:.06});
  gsap.from('footer > *',{y:18,opacity:0,duration:.7,stagger:.06,
    scrollTrigger:{trigger:'footer',start:'top 95%',toggleActions:'play none none none'}});

}else{
  /* ---- DESKTOP: full 3D motion ---- */

  /* Hero content tilts back into 3D as you scroll out */
  gsap.to('.hero-content',{
    rotateX:18, scale:.92, opacity:.4,
    transformPerspective:1400, transformOrigin:'center top',
    scrollTrigger:{trigger:'#hero',start:'top top',end:'bottom 30%',scrub:1}
  });

  /* Hero mountain SVG: rotates and lifts as you scroll out */
  gsap.to('#hero-mountain',{
    rotateX:-6, scale:1.08,
    transformPerspective:1800, transformOrigin:'center bottom',
    scrollTrigger:{trigger:'#hero',start:'top top',end:'bottom top',scrub:1.2}
  });

  /* Marquee strip: 3D scale-in entrance */
  gsap.from('#strip',{
    scaleY:0, opacity:0, transformOrigin:'center',
    duration:1.2, ease:'power4.out',
    scrollTrigger:{trigger:'#strip',start:'top 90%',toggleActions:'play none none none'}
  });

  /* Stat boxes — gentle stagger in */
  gsap.from('.id-stat',{
    y:30, opacity:0,
    duration:.7, stagger:.1, ease:'power2.out',
    scrollTrigger:{trigger:'.id-stats',start:'top 85%',toggleActions:'play none none none'}
  });

  /* Identity right column subtle continuous 3D float */
  gsap.to('.ident-right',{
    rotateY:2, rotateX:-1.5,
    transformPerspective:1500, transformOrigin:'center',
    duration:8, ease:'sine.inOut',
    repeat:-1, yoyo:true
  });

  /* Method section header — 3D entrance */
  gsap.from('.meth-header > div',{
    rotateY:-15, x:-30, opacity:0,
    transformPerspective:1200,
    duration:1, ease:'power3.out',
    scrollTrigger:{trigger:'#method',start:'top 75%',toggleActions:'play none none none'}
  });
  gsap.from('.meth-desc',{
    rotateY:15, x:30, opacity:0,
    transformPerspective:1200,
    duration:1, ease:'power3.out',
    scrollTrigger:{trigger:'#method',start:'top 75%',toggleActions:'play none none none'}
  });

  /* Method cards — enhanced 3D entrance */
  gsap.utils.toArray('.meth-card').forEach((c,i)=>{
    gsap.fromTo(c,
      {rotateY:i===1?0:i===0?-25:25, rotateX:30, z:-200, y:60, opacity:0},
      {
        rotateY:0, rotateX:0, z:0, y:0, opacity:1,
        transformPerspective:1400, transformOrigin:'center center',
        duration:1.2, ease:'power3.out', delay:i*.18,
        scrollTrigger:{trigger:'.meth-grid',start:'top 78%',toggleActions:'play none none none'}
      }
    );
  });

  /* Price block — dramatic drop-in */
  gsap.utils.toArray('.mc-price').forEach((p,i)=>{
    gsap.from(p,{
      rotateX:-90, opacity:0, y:-20,
      transformPerspective:800, transformOrigin:'center top',
      duration:.8, delay:i*.18+.5, ease:'back.out(1.4)',
      scrollTrigger:{trigger:'.meth-grid',start:'top 75%',toggleActions:'play none none none'}
    });
  });

  /* Contact section — entrance with depth */
  gsap.from('#contact .contact-inner > div',{
    z:-150, y:60, opacity:0,
    transformPerspective:1400,
    duration:1.2, stagger:.18, ease:'power3.out',
    scrollTrigger:{trigger:'#contact',start:'top 75%',toggleActions:'play none none none'}
  });

  /* Form fields — 3D fade in stagger */
  gsap.from('.ct-field',{
    rotateX:-45, y:30, opacity:0,
    transformPerspective:900, transformOrigin:'center top',
    duration:.7, stagger:.08, ease:'power3.out',
    scrollTrigger:{trigger:'.ct-form',start:'top 80%',toggleActions:'play none none none'}
  });

  /* Footer — soft entrance */
  gsap.from('footer > *',{
    y:24, opacity:0,
    duration:.9, stagger:.08, ease:'power2.out',
    scrollTrigger:{trigger:'footer',start:'top 95%',toggleActions:'play none none none'}
  });
}

/* Scroll-velocity-driven skew on hero name (subtle juice) */
let heroSkew = {v:0};
ScrollTrigger.create({
  start:0, end:'max',
  onUpdate:self=>{
    const v = self.getVelocity()/-400;
    const clamped = Math.max(-8,Math.min(8,v));
    gsap.to(heroSkew,{
      v:clamped, duration:.3, overwrite:true,
      onUpdate:()=>gsap.set('.hero-name',{skewY:heroSkew.v})
    });
  }
});

/* Marquee speed reacts to scroll velocity */
let mqSpeed = 1;
ScrollTrigger.create({
  trigger:'#strip',start:'top bottom',end:'bottom top',
  onUpdate:self=>{
    const v = Math.abs(self.getVelocity())/2000;
    const target = 1 + Math.min(v,3);
    mqSpeed += (target-mqSpeed)*.1;
    qs('#mq1').style.animationDuration = (20/mqSpeed)+'s';
  }
});

/* Recalculate layout on resize / orientation change (mobile rotate) */
let resizeT;
window.addEventListener('resize',()=>{
  clearTimeout(resizeT);
  resizeT=setTimeout(()=>ScrollTrigger.refresh(),200);
});
window.addEventListener('orientationchange',()=>{
  setTimeout(()=>ScrollTrigger.refresh(),300);
});