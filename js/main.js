document.addEventListener('DOMContentLoaded', function () {

  var yrs = new Date().getFullYear() - 2018;
  document.getElementById('years-exp-about').textContent = yrs;
  document.getElementById('years-exp-dialog').textContent = yrs;
  document.getElementById('copyright-year').textContent = new Date().getFullYear();

  var xpFill = document.getElementById('xp-fill');
  var xpText = document.getElementById('xp-text');
  if (xpFill && xpText) {
    xpText.textContent = yrs + ' yrs';
    setTimeout(function () { xpFill.style.width = (yrs * 10) + '%'; }, 300);
  }

  // Music card
  var musicCard = document.querySelector('[data-music-url]');
  if (musicCard) {
    var url = musicCard.getAttribute('data-music-url');
    var videoId = url.match(/[?&]v=([^&]+)/);
    if (videoId) videoId = videoId[1];

    if (videoId) {
      document.getElementById('music-thumb').src =
        'https://img.youtube.com/vi/' + videoId + '/mqdefault.jpg';
    }

    document.getElementById('music-link').href = url;

    var ytUrl = 'https://www.youtube.com/watch?v=' + videoId;
    fetch('https://noembed.com/embed?url=' + encodeURIComponent(ytUrl))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var songTitle = data.title || '';
        var artist = data.author_name || '';
        var dashIdx = songTitle.indexOf(' - ');
        if (dashIdx > -1) {
          artist = songTitle.substring(0, dashIdx);
          songTitle = songTitle.substring(dashIdx + 3);
        }
        document.getElementById('music-title').textContent = songTitle;
        document.getElementById('music-artist').textContent = artist;
      })
      .then(function () { checkMarquee(); })
      .catch(function () {
        document.getElementById('music-title').textContent = 'Check it out';
        document.getElementById('music-artist').textContent = 'YouTube Music';
      });
  }

  function checkMarquee() {
    var title = document.getElementById('music-title');
    var wrap = document.querySelector('.song-title-wrap');
    if (title.scrollWidth > wrap.offsetWidth) {
      var dist = -(title.scrollWidth - wrap.offsetWidth + 16);
      title.style.setProperty('--scroll-dist', dist + 'px');
      title.classList.add('is-overflow');
    }
  }

  // Konami code easter egg
  var konamiSeq = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
  var konamiPos = 0;
  var konamiActive = false;

  document.addEventListener('keydown', function (e) {
    if (konamiActive) return;
    if (e.keyCode === konamiSeq[konamiPos]) {
      konamiPos++;
      if (konamiPos === konamiSeq.length) {
        konamiPos = 0;
        konamiActive = true;
        triggerEasterEgg();
      }
    } else {
      konamiPos = 0;
    }
  });

  function triggerEasterEgg() {
    spawnCoins();
    monstersGoWild();
    if (wolfActive) maxOutUpgrades();
    setTimeout(function () { konamiActive = false; }, 5000);
  }

  function spawnCoins() {
    var count = 30;
    for (var i = 0; i < count; i++) {
      (function (delay) {
        setTimeout(function () {
          var coin = document.createElement('img');
          coin.src = 'images/coin.svg';
          coin.className = 'falling-coin';
          coin.style.left = Math.random() * 100 + 'vw';
          coin.style.animationDuration = (2 + Math.random() * 2) + 's';
          coin.style.animationDelay = '0s';
          document.body.appendChild(coin);
          coin.addEventListener('animationend', function () {
            coin.remove();
          });
        }, delay);
      })(i * 100);
    }
  }

  function monstersGoWild() {
    var monsters = document.querySelectorAll('.forest-monster');
    monsters.forEach(function (m) {
      m.classList.add('monster-wild');
    });
    setTimeout(function () {
      monsters.forEach(function (m) {
        m.classList.remove('monster-wild');
      });
    }, 5000);
  }

  // Wolf adventure — physics-based movement
  var wolfWrap = document.getElementById('wolf-wrap');
  var wolf = document.getElementById('roaming-wolf');
  var wolfShadow = document.getElementById('wolf-shadow');
  var avatarImg = document.querySelector('.avatar-img');
  var allMonsters = Array.from(document.querySelectorAll('.forest-monster'));
  var wolfActive = false;
  var wolfBusy = false;
  var wolfX = 0, wolfY = 0;
  var groundY = 0;
  var wolfCoins = 0;
  var wolfLevel = 0;
  var wolfSpeed = 120;
  var fairies = [];
  var fairyLoopRunning = false;
  var rainbowRunning = false;
  var UPGRADE_THRESHOLDS = [10, 20, 30, 40, 50, 100];
  var UPGRADE_NAMES = ['CROWN UNLOCKED!', 'WINGS + SPEED!', 'FAIRIES SUMMONED!', 'LASER EYES!', 'RAINBOW AURA!', 'You won!'];
  var auraInterval = null;
  var congaActive = false;
  var coinHud = document.getElementById('coin-hud');
  var coinCount = document.getElementById('coin-count');
  var upgradeBanner = document.getElementById('upgrade-banner');

  var flyerSrcs = ['bat.svg', 'wisp.svg'];
  function isFlyer(m) {
    return flyerSrcs.some(function (s) { return m.src && m.src.indexOf(s) > -1; });
  }

  function setWolfPos(x, y) {
    wolfX = x;
    wolfY = y;
    wolfWrap.style.left = x + 'px';
    wolfWrap.style.top = y + 'px';
    wolfShadow.style.left = (x + 8) + 'px';
    wolfShadow.style.top = (groundY + 48) + 'px';
    var heightOff = Math.max(0, groundY - y);
    var shadowScale = Math.max(0.3, 1 - heightOff / 300);
    wolfShadow.style.transform = 'scaleX(' + shadowScale + ')';
    wolfShadow.style.opacity = shadowScale;
  }

  function setWolfDir(targetX) {
    var flip = targetX < wolfX;
    var dir = flip ? 'scaleX(-1)' : 'scaleX(1)';
    wolfWrap.style.setProperty('--wolf-dir', dir);
    wolfWrap.style.setProperty('--lunge-dir', flip ? '-14px' : '14px');
    wolf.style.transform = flip ? 'scaleX(-1)' : 'scaleX(1)';
  }

  function wolfState(state) {
    wolfWrap.classList.remove('wolf-walking', 'wolf-idle', 'wolf-squish', 'wolf-lunge', 'wolf-wings-out');
    if (state) wolfWrap.classList.add(state);
  }

  function isMonsterVisible(m) {
    if (m.style.display === 'none') return false;
    if (m.classList.contains('monster-dying')) return false;
    return window.getComputedStyle(m).display !== 'none';
  }

  function getAliveMonsters() {
    return allMonsters.filter(isMonsterVisible);
  }

  function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function killMonster(target) {
    if (congaActive) return;
    if (target.classList.contains('monster-dying')) return;
    var rect = target.getBoundingClientRect();
    addCoin(rect.left + rect.width / 2, rect.top);
    target.style.position = 'fixed';
    target.style.left = rect.left + 'px';
    target.style.top = rect.top + 'px';
    target.style.right = 'auto';
    target.style.bottom = 'auto';
    target.classList.add('monster-dying');
    setTimeout(function () {
      target.style.display = 'none';
      target.classList.remove('monster-dying');
      target.style.position = '';
      target.style.left = '';
      target.style.top = '';
      target.style.right = '';
      target.style.bottom = '';
      scheduleRespawn();
    }, 500);
  }

  function addCoin(x, y) {
    var roll = Math.random();
    var lucky = wolfLevel >= 1;
    var amount = roll < (lucky ? 0.20 : 0.10) ? 5 : roll < (lucky ? 0.70 : 0.35) ? 3 : 1;
    wolfCoins += amount;
    coinCount.textContent = wolfCoins;
    for (var c = 0; c < amount; c++) {
      (function (i) {
        setTimeout(function () {
          var particle = document.createElement('div');
          particle.className = 'coin-particle';
          var img = document.createElement('img');
          img.src = 'images/coin.svg';
          img.width = 14;
          img.height = 14;
          img.style.imageRendering = 'pixelated';
          particle.appendChild(img);
          particle.style.left = (x + (i - Math.floor(amount / 2)) * 12) + 'px';
          particle.style.top = y + 'px';
          document.body.appendChild(particle);
          setTimeout(function () { particle.remove(); }, 800);
        }, i * 80);
      })(c);
    }

    var newLevel = 0;
    for (var i = 0; i < UPGRADE_THRESHOLDS.length; i++) {
      if (wolfCoins >= UPGRADE_THRESHOLDS[i]) newLevel = i + 1;
    }
    if (newLevel > wolfLevel) {
      wolfLevel = newLevel;
      applyUpgrade(newLevel);
    }
  }

  function showUpgradeBanner(level) {
    upgradeBanner.textContent = UPGRADE_NAMES[level - 1];
    upgradeBanner.style.display = 'block';
    upgradeBanner.style.animation = 'none';
    upgradeBanner.offsetHeight;
    upgradeBanner.style.animation = '';
    setTimeout(function () { upgradeBanner.style.display = 'none'; }, 2000);
  }

  function applyUpgrade(level) {
    showUpgradeBanner(level);
    switch (level) {
      case 1:
        wolf.querySelector('.wolf-crown').style.display = 'block';
        break;
      case 2:
        wolfWrap.classList.add('wolf-wings-permanent');
        wolfSpeed = 240;
        break;
      case 3:
        spawnFairies();
        healHeart();
        break;
      case 4:
        break;
      case 5:
        startRainbowAura();
        startAuraDamage();
        break;
      case 6:
        startConga();
        break;
    }
  }

  function spawnFairies() {
    var colors = ['#f472b6', '#a78bfa', '#34d399'];
    for (var i = 0; i < 3; i++) {
      var fairy = document.createElement('div');
      fairy.className = 'wolf-fairy';
      fairy.style.color = colors[i];
      fairy.innerHTML = '<svg viewBox="0 0 10 10" width="12" height="12" shape-rendering="crispEdges">' +
        '<rect x="3" y="1" width="4" height="2" fill="' + colors[i] + '" opacity="0.6"/>' +
        '<rect x="4" y="3" width="2" height="4" fill="' + colors[i] + '"/>' +
        '<rect x="2" y="3" width="2" height="2" fill="' + colors[i] + '" opacity="0.4"/>' +
        '<rect x="6" y="3" width="2" height="2" fill="' + colors[i] + '" opacity="0.4"/>' +
        '</svg>';
      fairy.style.left = wolfX + 'px';
      fairy.style.top = wolfY + 'px';
      document.body.appendChild(fairy);
      fairies.push({ el: fairy, x: wolfX, y: wolfY, offset: (i + 1) * 18, angle: i * 2.1 });
    }
    if (!fairyLoopRunning) {
      fairyLoopRunning = true;
      requestAnimationFrame(fairyLoop);
    }
  }

  function fairyLoop() {
    if (fairies.length === 0) { fairyLoopRunning = false; return; }
    var time = performance.now() / 1000;
    for (var i = 0; i < fairies.length; i++) {
      var f = fairies[i];
      var orbitX = Math.sin(time * 1.5 + f.angle) * f.offset;
      var orbitY = Math.cos(time * 2 + f.angle) * (f.offset * 0.6);
      var targetX = wolfX + 36 + orbitX;
      var targetY = wolfY - 10 + orbitY;
      f.x += (targetX - f.x) * 0.08;
      f.y += (targetY - f.y) * 0.08;
      f.el.style.left = f.x + 'px';
      f.el.style.top = f.y + 'px';
    }
    requestAnimationFrame(fairyLoop);
  }

  function fireLaser(target) {
    var rect = target.getBoundingClientRect();
    var targetCX = rect.left + rect.width / 2;
    var targetCY = rect.top + rect.height / 2;
    var flip = wolf.style.transform === 'scaleX(-1)';
    var eyeX = wolfX + (flip ? 10 : 52);
    var eyeY = wolfY + 22;
    var dx = targetCX - eyeX;
    var dy = targetCY - eyeY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var angle = Math.atan2(dy, dx) * (180 / Math.PI);

    var beam = document.createElement('div');
    beam.className = 'wolf-laser';
    beam.style.left = eyeX + 'px';
    beam.style.top = eyeY + 'px';
    beam.style.width = dist + 'px';
    beam.style.transform = 'rotate(' + angle + 'deg)';
    document.body.appendChild(beam);
    wolfWrap.classList.add('wolf-laser-active');
    setTimeout(function () {
      beam.remove();
      wolfWrap.classList.remove('wolf-laser-active');
    }, 300);
  }

  function startRainbowAura() {
    if (rainbowRunning) return;
    rainbowRunning = true;
    var aura = document.createElement('div');
    aura.className = 'wolf-rainbow-aura';
    wolfWrap.appendChild(aura);
  }

  function healHeart() {
    var half = document.querySelector('.hp-heart-half');
    if (half) {
      half.classList.remove('hp-heart-half');
      half.classList.add('hp-heart-healed');
    }
  }

  function startAuraDamage() {
    auraInterval = setInterval(function () {
      if (!wolfActive || wolfBusy) return;
      var alive = getAliveMonsters();
      for (var i = 0; i < alive.length; i++) {
        var rect = alive[i].getBoundingClientRect();
        var mx = rect.left + rect.width / 2;
        var my = rect.top + rect.height / 2;
        var wx = wolfX + 24;
        var wy = wolfY + 24;
        var dist = Math.sqrt((mx - wx) * (mx - wx) + (my - wy) * (my - wy));
        if (dist < 80) {
          killMonster(alive[i]);
          break;
        }
      }
    }, 500);
  }

  function startConga() {
    congaActive = true;
    wolfBusy = true;
    wolfState('wolf-idle');
    if (auraInterval) { clearInterval(auraInterval); auraInterval = null; }
    var auraEl = wolfWrap.querySelector('.wolf-rainbow-aura');
    if (auraEl) auraEl.remove();

    // Revive all dead monsters
    allMonsters.forEach(function (m) {
      m.style.display = '';
      m.style.position = '';
      m.style.left = '';
      m.style.top = '';
      m.style.right = '';
      m.style.bottom = '';
      m.classList.remove('monster-dying');
    });

    // Line everyone up for conga — wolf leads
    var centerX = window.innerWidth / 2;
    var startX = -60;
    var lineY = groundY;
    var spacing = 50;
    var members = [wolfWrap].concat(allMonsters);
    var congaDur = 6000;
    var endX = window.innerWidth + 80;

    // Remove normal animations from monsters
    allMonsters.forEach(function (m) {
      m.style.animation = 'none';
      m.style.position = 'fixed';
    });

    // Animate conga line across screen
    var congaStart = performance.now();
    function congaFrame(now) {
      var t = Math.min((now - congaStart) / congaDur, 1);
      for (var i = 0; i < members.length; i++) {
        var delay = i * 0.08;
        var mt = Math.max(0, Math.min((t - delay) / (1 - delay * members.length / members.length), 1));
        var x = startX + (endX - startX) * mt - i * spacing;
        var bounce = Math.abs(Math.sin((mt * congaDur / 200) + i * 1.2)) * 12;
        var el = members[i];
        if (i === 0) {
          setWolfPos(x, lineY - bounce);
          wolfState('wolf-walking');
          setWolfDir(endX);
        } else {
          el.style.left = x + 'px';
          el.style.top = (lineY - bounce) + 'px';
          el.style.transform = 'rotate(' + (Math.sin((mt * congaDur / 300) + i) * 10) + 'deg)';
        }
      }
      if (t < 1) {
        requestAnimationFrame(congaFrame);
      } else {
        // Second pass — conga back from right to center
        var returnStart = performance.now();
        var returnDur = 4000;
        function returnFrame(now2) {
          var t2 = Math.min((now2 - returnStart) / returnDur, 1);
          for (var i = 0; i < members.length; i++) {
            var delay2 = i * 0.06;
            var mt2 = Math.max(0, Math.min((t2 - delay2) / (1 - delay2), 1));
            var targetX = centerX - (members.length / 2 - i) * spacing;
            var x2 = endX + (targetX - endX) * mt2;
            var bounce2 = Math.abs(Math.sin((mt2 * returnDur / 200) + i * 1.2)) * 12;
            var el2 = members[i];
            if (i === 0) {
              setWolfPos(x2, lineY - bounce2);
              setWolfDir(targetX < wolfX ? targetX : wolfX + 1);
            } else {
              el2.style.left = x2 + 'px';
              el2.style.top = (lineY - bounce2) + 'px';
              el2.style.transform = 'rotate(' + (Math.sin((mt2 * returnDur / 300) + i) * 10) + 'deg)';
            }
          }
          if (t2 < 1) {
            requestAnimationFrame(returnFrame);
          } else {
            startCampfire(centerX, lineY, members);
          }
        }
        requestAnimationFrame(returnFrame);
      }
    }
    requestAnimationFrame(congaFrame);
  }

  function startCampfire(centerX, lineY, members) {
    wolfState('wolf-idle');

    // Create campfire on the ground
    var fire = document.createElement('div');
    fire.className = 'campfire';
    fire.innerHTML = '<svg viewBox="0 0 16 16" width="32" height="32" shape-rendering="crispEdges">' +
      '<rect x="5" y="12" width="6" height="2" fill="#92400e"/>' +
      '<rect x="4" y="14" width="8" height="2" fill="#78350f"/>' +
      '<rect x="6" y="8" width="4" height="4" fill="#f59e0b"/>' +
      '<rect x="5" y="6" width="6" height="4" fill="#f97316"/>' +
      '<rect x="6" y="4" width="4" height="4" fill="#ef4444"/>' +
      '<rect x="7" y="2" width="2" height="3" fill="#fbbf24" opacity="0.7"/>' +
      '</svg>';
    fire.style.left = centerX + 'px';
    fire.style.top = (lineY + 16) + 'px';
    document.body.appendChild(fire);

    // Split members: wolf + half on left, half on right
    var spacing = 44;
    var leftGroup = [];
    var rightGroup = [];
    for (var i = 0; i < members.length; i++) {
      if (i % 2 === 0) {
        leftGroup.push(members[i]);
      } else {
        rightGroup.push(members[i]);
      }
    }

    // Place left group
    for (var l = 0; l < leftGroup.length; l++) {
      var lx = centerX - 70 - l * spacing;
      var el = leftGroup[l];
      if (el === wolfWrap) {
        setWolfPos(lx, lineY);
        setWolfDir(centerX);
        wolfState('wolf-idle');
      } else {
        var mh = el.height || 40;
        el.style.left = lx + 'px';
        el.style.top = (lineY + 48 - mh) + 'px';
        el.style.transform = '';
        el.style.animation = 'campfire-sit 2s ease-in-out infinite alternate';
        el.style.animationDelay = (l * 0.3) + 's';
      }
    }

    // Place right group
    for (var r = 0; r < rightGroup.length; r++) {
      var rx = centerX + 50 + r * spacing;
      var el2 = rightGroup[r];
      var mh2 = el2.height || 40;
      el2.style.left = rx + 'px';
      el2.style.top = (lineY + 48 - mh2) + 'px';
      el2.style.transform = '';
      el2.style.animation = 'campfire-sit 2s ease-in-out infinite alternate';
      el2.style.animationDelay = (r * 0.3) + 's';
    }

  }

  function maxOutUpgrades() {
    var target = Math.min(wolfCoins + 50, 100);
    while (wolfCoins < target) {
      wolfCoins++;
      var newLevel = 0;
      for (var i = 0; i < UPGRADE_THRESHOLDS.length; i++) {
        if (wolfCoins >= UPGRADE_THRESHOLDS[i]) newLevel = i + 1;
      }
      if (newLevel > wolfLevel) {
        wolfLevel = newLevel;
        applyUpgrade(newLevel);
      }
    }
    coinCount.textContent = wolfCoins;
  }

  function scheduleRespawn() {
    var delay = 3000 + Math.random() * 4000;
    setTimeout(function () {
      var dead = allMonsters.filter(function (m) {
        return m.style.display === 'none';
      });
      if (dead.length === 0) return;
      var pick = randomPick(dead);
      pick.style.display = '';
      pick.style.animation = 'none';
      pick.offsetHeight;
      pick.style.animation = '';
    }, delay);
  }

  // Physics jump — parabolic arc with gravity
  function physicsJump(startX, startY, endX, endY, duration, callback) {
    var start = performance.now();
    var peakHeight = 80;
    wolfState('wolf-walking');
    setWolfDir(endX);

    function frame(now) {
      var t = Math.min((now - start) / duration, 1);
      var x = startX + (endX - startX) * t;
      var linearY = startY + (endY - startY) * t;
      var arc = -4 * peakHeight * t * (t - 1);
      setWolfPos(x, linearY - arc);
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        setWolfPos(endX, endY);
        wolfState('wolf-squish');
        setTimeout(function () {
          wolfState('wolf-idle');
          if (callback) callback();
        }, 300);
      }
    }
    requestAnimationFrame(frame);
  }

  // Double jump — Hollow Knight style, wings pop out on second jump
  function doubleJump(targetX, targetY, callback) {
    var startX = wolfX, startY = wolfY;
    var midY = startY - 90;
    var start = performance.now();
    var jump1Dur = 500;
    var hangDur = 120;
    var jump2Dur = 400;
    var totalDur = jump1Dur + hangDur + jump2Dur;

    wolfState('wolf-walking');
    setWolfDir(targetX);

    function frame(now) {
      var elapsed = now - start;
      var t = Math.min(elapsed / totalDur, 1);
      var x = startX + (targetX - startX) * t;

      if (elapsed < jump1Dur) {
        var jt = elapsed / jump1Dur;
        var arc = -4 * 60 * jt * (jt - 1);
        setWolfPos(x, startY - arc);
      } else if (elapsed < jump1Dur + hangDur) {
        wolfWrap.classList.add('wolf-wings-out');
        setWolfPos(x, midY);
      } else {
        var jt2 = (elapsed - jump1Dur - hangDur) / jump2Dur;
        var ease = jt2 * jt2;
        var y = midY + (targetY - midY) * ease;
        var boost = -4 * 40 * jt2 * (jt2 - 1);
        setWolfPos(x, y - boost);
      }

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        setWolfPos(targetX, targetY);
        wolfWrap.classList.remove('wolf-wings-out');
        if (callback) callback();
      }
    }
    requestAnimationFrame(frame);
  }

  // Walk toward a point with bobbing
  function walkTo(endX, endY, callback) {
    var startX = wolfX, startY = wolfY;
    var dx = endX - startX, dy = endY - startY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var speed = wolfSpeed;
    var duration = (dist / speed) * 1000;
    duration = Math.max(600, Math.min(duration, 3000));
    var start = performance.now();

    wolfState('wolf-walking');
    setWolfDir(endX);

    function frame(now) {
      var t = Math.min((now - start) / duration, 1);
      var ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      var x = startX + dx * ease;
      var y = startY + dy * ease;
      setWolfPos(x, y);
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        setWolfPos(endX, endY);
        wolfState('wolf-idle');
        if (callback) callback();
      }
    }
    requestAnimationFrame(frame);
  }

  // Wolf starts after 10s
  setTimeout(function () {
    if (!wolfWrap || !wolf || !avatarImg) return;
    wolfActive = true;
    avatarImg.classList.add('wolf-away');

    var ring = document.querySelector('.avatar-ring');
    var ringRect = ring.getBoundingClientRect();
    var startX = ringRect.left + ringRect.width / 2 - 24;
    var startY = ringRect.top + ringRect.height / 2 - 24;
    groundY = window.innerHeight - 130;

    wolfWrap.style.setProperty('--wolf-dir', 'scaleX(1)');
    wolfWrap.style.display = 'block';
    wolfShadow.style.display = 'block';
    coinHud.style.display = 'flex';
    setWolfPos(startX, startY);

    setTimeout(function () {
      var landX = window.innerWidth / 2 - 24;
      physicsJump(startX, startY, landX, groundY, 1200, function () {
        setTimeout(wolfPatrol, 1500);
      });
    }, 200);
  }, 4000);

  function wolfPatrol() {
    if (!wolfActive || wolfBusy || congaActive) return;
    var alive = getAliveMonsters();
    if (alive.length === 0) {
      setTimeout(wolfPatrol, 1000);
      return;
    }
    wolfBusy = true;
    var target = randomPick(alive);
    var rect = target.getBoundingClientRect();
    var centerX = rect.left + rect.width / 2;
    var centerY = rect.top + rect.height / 2;
    var approach = wolfX < centerX ? -1 : 1;
    var offset = rect.width / 2 + 28;
    var destX = centerX + approach * offset - 24;
    var destY = centerY - 24;

    function doAttack() {
      setWolfDir(centerX);
      wolfState('wolf-lunge');
      setTimeout(function () {
        wolfState('wolf-idle');
        killMonster(target);
        if (isFlyer(target)) {
          physicsJump(wolfX, wolfY, wolfX, groundY, 600, function () {
            wolfBusy = false;
            var patrolDelay = wolfLevel >= 4 ? (1000 + Math.random() * 1500) : (2000 + Math.random() * 2000);
            setTimeout(wolfPatrol, patrolDelay);
          });
        } else {
          wolfBusy = false;
          var patrolDelay = wolfLevel >= 4 ? (1000 + Math.random() * 1500) : (2000 + Math.random() * 2000);
          setTimeout(wolfPatrol, patrolDelay);
        }
      }, 250);
    }

    if (wolfLevel >= 4 && Math.random() < 0.5) {
      setWolfDir(centerX);
      fireLaser(target);
      setTimeout(function () {
        killMonster(target);
        wolfBusy = false;
        var patrolDelay = 1000 + Math.random() * 1500;
        setTimeout(wolfPatrol, patrolDelay);
      }, 300);
    } else if (isFlyer(target)) {
      var belowX = centerX - 24;
      walkTo(belowX, groundY, function () {
        doubleJump(destX, destY, doAttack);
      });
    } else {
      walkTo(destX, destY, doAttack);
    }
  }

  // Click wolf to bark
  if (wolfWrap) {
    wolfWrap.addEventListener('click', function (e) {
      e.stopPropagation();
      var bubble = document.createElement('div');
      bubble.className = 'bark-bubble';
      bubble.textContent = 'Woof!';
      bubble.style.left = (wolfX + 4) + 'px';
      bubble.style.top = (wolfY - 28) + 'px';
      document.body.appendChild(bubble);
      setTimeout(function () { bubble.remove(); }, 1000);

      var heart = document.createElement('div');
      heart.className = 'bark-heart';
      heart.textContent = '\u2764';
      heart.style.color = '#ef4444';
      heart.style.left = (wolfX + 16) + 'px';
      heart.style.top = (wolfY - 10) + 'px';
      var drift = (Math.random() - 0.5) * 80;
      heart.style.setProperty('--heart-dx', drift + 'px');
      document.body.appendChild(heart);
      setTimeout(function () { heart.remove(); }, 1400);
    });
  }

  var campfireLines = {
    'slime.svg': "I'm not even sticky...",
    'mushroom.svg': 'Spore friends!',
    'bat.svg': 'Cozy',
    'wisp.svg': '*flickers happily*',
    'skull.svg': 'I feel alive',
    'spider.svg': 'Toasty marshmallow'
  };

  function getMonsterLine(m) {
    var src = m.src || '';
    for (var key in campfireLines) {
      if (src.indexOf(key) > -1) return campfireLines[key];
    }
    return null;
  }

  // Click monster to kill (or chat at campfire)
  allMonsters.forEach(function (m) {
    m.addEventListener('click', function (e) {
      e.stopPropagation();
      if (congaActive) {
        var line = getMonsterLine(m);
        if (!line) return;
        var rect = m.getBoundingClientRect();
        var bubble = document.createElement('div');
        bubble.className = 'bark-bubble';
        bubble.textContent = line;
        bubble.style.left = (rect.left + rect.width / 2 - 20) + 'px';
        bubble.style.top = (rect.top - 28) + 'px';
        document.body.appendChild(bubble);
        setTimeout(function () { bubble.remove(); }, 1500);
        return;
      }
      killMonster(m);
    });
  });

});
