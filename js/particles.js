/* ==========================================================================
   Arumi Electrical Services — Electric Particle System
   Pink dots, spark trails, electric shock effects
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function () {
  var PARTICLE_COUNT = 80;
  var SPARK_COUNT = 12;
  var PINK = [233, 30, 139];
  var PINK_LIGHT = [255, 61, 165];
  var GOLD = [218, 165, 32];

  // --- Canvas Setup ---
  var canvas = document.createElement("canvas");
  canvas.id = "electric-bg";
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.zIndex = "0";
  canvas.style.pointerEvents = "none";
  document.body.insertBefore(canvas, document.body.firstChild);

  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var W = 0,
    H = 0;
  var mouseX = -1000,
    mouseY = -1000;
  var particles = [];
  var sparks = [];
  var shocks = [];
  var lastShock = 0;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
  }
  window.addEventListener("resize", resize);
  resize();

  document.addEventListener("mousemove", function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // --- Helper: random color ---
  function randColor() {
    var r = Math.random();
    if (r > 0.7) return GOLD;
    if (r > 0.4) return PINK_LIGHT;
    return PINK;
  }

  // --- Particles (floating dots) ---
  function createParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      size: Math.random() * 2.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.5 + 0.1,
      pulse: Math.random() * Math.PI * 2,
      pulseSpd: Math.random() * 0.02 + 0.005,
      color: randColor(),
    };
  }

  function updateParticle(p) {
    p.x += p.vx;
    p.y += p.vy;
    p.pulse += p.pulseSpd;

    // Mouse repulsion
    var dx = p.x - mouseX;
    var dy = p.y - mouseY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 150 && dist > 0) {
      var force = (150 - dist) / 150;
      p.x += (dx / dist) * force * 2;
      p.y += (dy / dist) * force * 2;
    }

    // Wrap
    if (p.x < -10) p.x = W + 10;
    if (p.x > W + 10) p.x = -10;
    if (p.y < -10) p.y = H + 10;
    if (p.y > H + 10) p.y = -10;
  }

  function drawParticle(p) {
    var glow = p.size + Math.sin(p.pulse) * 1.5;
    var alpha = p.opacity + Math.sin(p.pulse) * 0.15;
    var c = p.color;

    // Outer glow
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.abs(glow) * 3, 0, Math.PI * 2);
    ctx.fillStyle =
      "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + alpha * 0.12 + ")";
    ctx.fill();

    // Core dot
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.abs(glow), 0, Math.PI * 2);
    ctx.fillStyle =
      "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + alpha + ")";
    ctx.fill();
  }

  // --- Sparks (fast streaks) ---
  function createSpark() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      angle: Math.random() * Math.PI * 2,
      speed: Math.random() * 3 + 1.5,
      len: Math.random() * 20 + 10,
      life: 1,
      decay: Math.random() * 0.015 + 0.005,
      color: Math.random() > 0.6 ? GOLD : PINK_LIGHT,
    };
  }

  function resetSpark(s) {
    s.x = Math.random() * W;
    s.y = Math.random() * H;
    s.angle = Math.random() * Math.PI * 2;
    s.speed = Math.random() * 3 + 1.5;
    s.len = Math.random() * 20 + 10;
    s.life = 1;
    s.decay = Math.random() * 0.015 + 0.005;
    s.color = Math.random() > 0.6 ? GOLD : PINK_LIGHT;
  }

  function updateSpark(s) {
    s.x += Math.cos(s.angle) * s.speed;
    s.y += Math.sin(s.angle) * s.speed;
    s.life -= s.decay;
    s.angle += (Math.random() - 0.5) * 0.1;
    if (s.life <= 0) resetSpark(s);
  }

  function drawSpark(s) {
    var c = s.color;
    var tx = s.x - Math.cos(s.angle) * s.len;
    var ty = s.y - Math.sin(s.angle) * s.len;

    var grad = ctx.createLinearGradient(tx, ty, s.x, s.y);
    grad.addColorStop(0, "rgba(" + c[0] + "," + c[1] + "," + c[2] + ",0)");
    grad.addColorStop(
      1,
      "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + s.life * 0.6 + ")",
    );

    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(s.x, s.y);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // --- Shocks (lightning bolts) ---
  function generateBolt() {
    var angle = Math.random() * Math.PI * 2;
    var length = Math.random() * 80 + 40;
    var segs = [];
    var steps = Math.floor(Math.random() * 6) + 4;
    for (var i = 0; i < steps; i++) {
      var progress = (i + 1) / steps;
      var jag = (1 - progress) * 15;
      segs.push({
        x: Math.cos(angle) * length * progress + (Math.random() - 0.5) * jag,
        y: Math.sin(angle) * length * progress + (Math.random() - 0.5) * jag,
      });
    }
    return segs;
  }

  function createShock(x, y) {
    var bolts = [];
    var count = Math.floor(Math.random() * 4) + 3;
    for (var i = 0; i < count; i++) {
      bolts.push(generateBolt());
    }
    return { x: x, y: y, bolts: bolts, life: 1, decay: 0.03 };
  }

  function drawShock(sh) {
    if (sh.life <= 0) return;
    for (var b = 0; b < sh.bolts.length; b++) {
      var bolt = sh.bolts[b];

      // Main bolt line
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      for (var s = 0; s < bolt.length; s++) {
        ctx.lineTo(sh.x + bolt[s].x, sh.y + bolt[s].y);
      }
      ctx.strokeStyle = "rgba(233,30,139," + sh.life * 0.8 + ")";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Glow layer
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      for (var s2 = 0; s2 < bolt.length; s2++) {
        ctx.lineTo(sh.x + bolt[s2].x, sh.y + bolt[s2].y);
      }
      ctx.strokeStyle = "rgba(255,61,165," + sh.life * 0.3 + ")";
      ctx.lineWidth = 6;
      ctx.stroke();
    }

    // Center flash
    ctx.beginPath();
    ctx.arc(sh.x, sh.y, 8 * sh.life, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255," + sh.life * 0.5 + ")";
    ctx.fill();
  }

  // --- Connection lines ---
  function drawConnections() {
    var maxDist = 120;
    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var dx = particles[i].x - particles[j].x;
        var dy = particles[i].y - particles[j].y;
        var dist = dx * dx + dy * dy; // skip sqrt for perf
        if (dist < maxDist * maxDist) {
          var d = Math.sqrt(dist);
          var alpha = (1 - d / maxDist) * 0.08;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = "rgba(233,30,139," + alpha + ")";
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  // --- Click to shock ---
  document.addEventListener("click", function (e) {
    shocks.push(createShock(e.clientX, e.clientY));
  });

  // --- Init particles & sparks ---
  for (var i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(createParticle());
  }
  for (var j = 0; j < SPARK_COUNT; j++) {
    sparks.push(createSpark());
  }

  // --- Main Loop ---
  function animate(now) {
    ctx.clearRect(0, 0, W, H);

    // Particles
    for (var i = 0; i < particles.length; i++) {
      updateParticle(particles[i]);
      drawParticle(particles[i]);
    }

    // Connections
    drawConnections();

    // Sparks
    for (var j = 0; j < sparks.length; j++) {
      updateSpark(sparks[j]);
      drawSpark(sparks[j]);
    }

    // Random shocks every 3-7s
    if (now - lastShock > 3000 + Math.random() * 4000) {
      lastShock = now;
      shocks.push(createShock(Math.random() * W, Math.random() * H));
    }

    // Draw & clean shocks
    for (var k = shocks.length - 1; k >= 0; k--) {
      shocks[k].life -= shocks[k].decay;
      drawShock(shocks[k]);
      if (shocks[k].life <= 0) shocks.splice(k, 1);
    }

    requestAnimationFrame(animate);
  }

  // --- Start (respect reduced motion) ---
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    requestAnimationFrame(animate);
  }
});
