// ✅ content.js: Market Hunter & Analyzer Edition
console.log("🚀 X Simple Mode: Hunter Mode with Velocity Tracking Active.");

const startApp = () => {
  if (!chrome.runtime?.id) return;

  chrome.storage.local.get(["enabled", "autoScroll", "postIts", "ytVideoId", "analysisEnabled"], (res) => {
    if (chrome.runtime.lastError || res.enabled === false) return;

    if (!document.body) {
      setTimeout(startApp, 500);
      return;
    }

    const videoId = res.ytVideoId || "vr9dLvJs7VE";
    const isAnalysisOn = res.analysisEnabled !== false;
    init(res.autoScroll === true, res.postIts || [], videoId, isAnalysisOn);
  });
};

if (document.readyState === "complete") {
  startApp();
} else {
  window.addEventListener("load", startApp);
}

function init(autoScrollEnabled, savedPostIts, savedVideoId, isAnalysisOn) {
  let postIts = savedPostIts;
  let currentVideoId = savedVideoId;
  let isInvalidated = false;

  // URLをキーにしたSetで重複チェックを高速化（5年のPython経験を活かす効率化）
  const existingUrls = new Set(postIts.map(p => p.url));

  function cleanAndInject() {
    if (!chrome.runtime?.id || isInvalidated) { isInvalidated = true; return; }

    // 1. UIの掃除（おすすめタブとトレンド）
    document.querySelectorAll('[role="tab"]').forEach(tab => {
      if (tab.innerText.includes("おすすめ") || tab.innerText.includes("For you")) tab.style.display = "none";
    });
    const sidebar = document.querySelector('[data-testid="sidebarColumn"]');
    if (sidebar) {
      const native = sidebar.querySelector('section, aside, [aria-label*="トレンド"]');
      if (native) native.style.display = "none";
    }

    // 2. 記事の解析 & 注入
    document.querySelectorAll('article:not([data-processed])').forEach(article => {
      article.setAttribute('data-processed', 'true'); // 二重処理防止

      // 広告の即時削除
      if (article.innerText.includes("プロモーション") || article.innerText.includes("Ad")) {
        article.closest('[data-testid="cellInnerDiv"]')?.remove();
        return;
      }

      const group = article.querySelector('[role="group"][aria-label*="表示"]');
      if (!group) return;

      const label = group.getAttribute('aria-label') || "";
      const stats = {
        impressions: (label.match(/([\d,]+)\s*件の表示/) || ["", "0"])[1],
        retweets: (label.match(/([\d,]+)\s*件のリポスト/) || ["", "0"])[1],
        likes: (label.match(/([\d,]+)\s*件のいいね/) || ["", "0"])[1]
      };

      const imp = parseInt(stats.impressions.replace(/[,，]/g, '')) || 0;
      const timeEl = article.querySelector('time');
      const tweetUrl = timeEl ? timeEl.closest('a').href : null;
      const postedAt = timeEl ? timeEl.getAttribute('datetime') : null; // 🕒 投稿日時を取得

      // 自動ハンター（10万インプ以上を自動保存）
      if (isAnalysisOn && imp >= 100000 && tweetUrl && !existingUrls.has(tweetUrl)) {
        addPostIt(article, tweetUrl, stats, postedAt);
      }

      // 手動ボタン注入
      injectManualButton(article, tweetUrl, stats, postedAt);
    });
    renderRightPanel();
  }

  function injectManualButton(article, url, stats, postedAt) {
    if (article.querySelector('.postit-btn')) return;
    const btn = document.createElement('button');
    btn.innerText = "📌 収穫";
    btn.className = "postit-btn";
    btn.style = "margin-left:12px; cursor:pointer; background:#FBC02D; color:#333; border:1px solid #999; border-radius:4px; font-size:11px; padding:2px 6px; font-weight:bold; height:fit-content; align-self:center; pointer-events:auto;";
    btn.onclick = (e) => {
      e.stopPropagation();
      addPostIt(article, url, stats, postedAt);
    };
    const actionBar = article.querySelector('[role="group"]');
    if (actionBar) actionBar.appendChild(btn);
  }

  function addPostIt(article, url, stats, postedAt) {
    if (!chrome.runtime?.id || existingUrls.has(url)) return;

    const tweetText = article.querySelector('[data-testid="tweetText"]')?.innerText || "内容なし";
    const userName = article.querySelector('[data-testid="User-Name"]')?.innerText.split('\n')[0] || "不明";
    
    const imp = parseInt(stats.impressions.replace(/[,，]/g, '')) || 0;
    const rt = parseInt(stats.retweets.replace(/[,，]/g, '')) || 0;
    const fav = parseInt(stats.likes.replace(/[,，]/g, '')) || 0;
    const engRate = imp > 0 ? ((rt + fav) / imp * 100).toFixed(2) : 0;

    const rankInfo = getRankInfo(imp, isAnalysisOn);

    const newItem = {
      id: Date.now(),
      savedAt: new Date().toLocaleString('ja-JP'),
      postedAt: postedAt, // 🕒 分析の鍵：投稿時間
      user: userName,
      text: tweetText.substring(0, 120),
      url: url,
      stats: stats,
      style: rankInfo.style,
      analysis: { engRate, rank: rankInfo.rank }
    };

    postIts.unshift(newItem);
    existingUrls.add(url);
    chrome.storage.local.set({ postIts: postIts }, () => renderRightPanel());
  }

  function getRankInfo(imp, isAnalysisOn) {
    if (!isAnalysisOn) return { rank: "通常", style: { bgColor: "#FFE082", textColor: "#212121" } };
    if (imp >= 1000000) return { rank: "🔥🔥 超弩級", style: { bgColor: "#b71c1c", textColor: "#ffffff" } };
    if (imp >= 500000) return { rank: "🔥 大バズ", style: { bgColor: "#ef5350", textColor: "#ffffff" } };
    return { rank: "✨ 観測対象", style: { bgColor: "#ffcdd2", textColor: "#b71c1c" } };
  }

  function removePostIt(id) {
    if (!chrome.runtime?.id) return;
    const target = postIts.find(p => p.id === id);
    if (target) existingUrls.delete(target.url);
    postIts = postIts.filter(item => item.id !== id);
    chrome.storage.local.set({ postIts: postIts }, () => renderRightPanel());
  }

  function renderRightPanel() {
    if (!document.body || !chrome.runtime?.id) return;
    let container = document.getElementById('custom-right-panel');
    if (!container) {
      container = document.createElement('div');
      container.id = 'custom-right-panel';
      container.style = "position:fixed; right:20px; top:10px; width:300px; min-width:300px; max-width:300px; height:98vh; z-index:9999; display:flex; flex-direction:column; pointer-events:none; box-sizing:border-box;";
      document.body.appendChild(container);
    }

    // --- YouTube Area & Input ---
    let ytArea = document.getElementById('custom-yt-area') || createYTArea(container);
    const iframeSrc = `https://www.youtube.com/embed/${currentVideoId}`;
    if (!ytArea.querySelector('iframe') || ytArea.querySelector('iframe').src !== iframeSrc) {
      ytArea.innerHTML = `<iframe width="100%" height="100%" src="${iframeSrc}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    }

    let ytInput = document.getElementById('custom-yt-input') || createYTInput(container);

    // --- CSV Button ---
    let csvBtn = document.getElementById('custom-csv-btn') || createCSVBtn(container);

    // --- List Area ---
    let listDiv = document.getElementById('custom-postit-list');
    if (!listDiv) {
      listDiv = document.createElement('div');
      listDiv.id = 'custom-postit-list';
      listDiv.style = "flex-grow:1; overflow-y:auto; pointer-events:auto; scrollbar-width:none;";
      container.appendChild(listDiv);
    }
    
    updateListUI(listDiv);
  }

  // --- UI Helper Functions ---
  function createYTArea(parent) {
    const el = document.createElement('div');
    el.id = 'custom-yt-area';
    el.style = "background:#000; width:100%; height:168.75px; min-height:168.75px; margin-bottom:10px; pointer-events:auto; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.5); flex-shrink:0;";
    parent.appendChild(el);
    return el;
  }

  function createYTInput(parent) {
    const el = document.createElement('input');
    el.id = 'custom-yt-input';
    el.placeholder = "YouTube URLをコピペしてEnter";
    el.style = "width:100%; background:#222; color:#eee; border:1px solid #444; font-size:11px; padding:8px; margin-bottom:10px; pointer-events:auto; border-radius:6px; outline:none; flex-shrink:0; box-sizing:border-box;";
    el.onkeydown = (e) => {
      if (e.key === 'Enter' && el.value.trim()) {
        let val = el.value.trim();
        let vid = val;
        try {
          if (val.includes("v=")) vid = val.split("v=")[1].split("&")[0];
          else if (val.includes("youtu.be/")) vid = val.split("youtu.be/")[1].split(/[?#]/)[0];
        } catch(err){}
        chrome.storage.local.set({ ytVideoId: vid }, () => {
          currentVideoId = vid;
          el.value = "";
          renderRightPanel();
        });
      }
    };
    parent.appendChild(el);
    return el;
  }

  function createCSVBtn(parent) {
    const el = document.createElement('button');
    el.id = 'custom-csv-btn';
    el.innerText = "📊 CSV出力してリセット";
    el.style = "width:100%; background:#2e7d32; color:white; border:none; font-size:11px; padding:10px; margin-bottom:10px; pointer-events:auto; border-radius:8px; font-weight:bold; cursor:pointer; flex-shrink:0;";
    el.onclick = () => {
      if (postIts.length === 0) return;
      const now = new Date();
      const fileName = `X_Hunter_${now.getFullYear()}${now.getMonth()+1}${now.getDate()}_${now.getHours()}${now.getMinutes()}.csv`;
      let csv = "\ufeff保存日時,投稿日時,ユーザー名,内容,URL,表示回数,反応率,いいね,リポスト,ランク\n";
      postIts.forEach(i => {
        csv += `"${i.savedAt}","${i.postedAt || ''}","${i.user}","${i.text.replace(/"/g, '""')}","${i.url}","${i.stats.impressions}","${i.analysis.engRate}%","${i.stats.likes}","${i.stats.retweets}","${i.analysis.rank}"\n`;
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      link.download = fileName;
      link.click();
      if (confirm("リストをリセットしますか？")) {
        postIts = [];
        existingUrls.clear();
        chrome.storage.local.set({ postIts: [] }, () => renderRightPanel());
      }
    };
    parent.appendChild(el);
    return el;
  }

  function updateListUI(listDiv) {
    listDiv.innerHTML = `<h3 style="background:#333; color:white; padding:8px; font-size:12px; text-align:center; border-radius:8px 8px 0 0; margin:0;">📌 ハンターモード</h3>
    <div style="background:#444; color:#ccc; padding:6px; font-size:9px; margin-bottom:10px; border-radius:0 0 8px 8px; text-align:center;">📊 反応率 = (❤️+🔁) ÷ 👁️ × 100</div>`;
    
    postIts.forEach(item => {
      const card = document.createElement('div');
      card.style = `background:${item.style.bgColor}; color:${item.style.textColor}; padding:10px; margin-bottom:10px; border-radius:10px; font-size:11px; position:relative; cursor:pointer; pointer-events:auto; box-shadow:0 2px 5px rgba(0,0,0,0.2);`;
      card.onclick = () => window.open(item.url, '_blank');
      card.innerHTML = `
        <div style="font-weight:bold; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:4px; margin-bottom:6px; display:flex; justify-content:space-between;">
          <span>👤 ${item.user}</span>
          <span style="font-size:9px; opacity:0.8;">${item.analysis.rank}</span>
        </div>
        <div style="margin:4px 0; line-height:1.4;">${item.text}</div>
        <div style="font-size:8px; opacity:0.6; margin-bottom:4px;">🕒 収穫: ${item.savedAt}</div>
        <div style="margin-top:4px; display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
          <div style="background:rgba(255,255,255,0.3); padding:3px; border-radius:4px; text-align:center; font-size:9px;">👁️ <b>${item.stats.impressions}</b></div>
          <div style="background:rgba(255,255,255,0.3); padding:3px; border-radius:4px; text-align:center; font-size:9px;">📈 <b>${item.analysis.engRate}%</b></div>
          <div style="background:rgba(255,255,255,0.3); padding:3px; border-radius:4px; text-align:center; font-size:9px;">❤️ <b>${item.stats.likes}</b></div>
          <div style="background:rgba(255,255,255,0.3); padding:3px; border-radius:4px; text-align:center; font-size:9px;">🔁 <b>${item.stats.retweets}</b></div>
        </div>
      `;
      const del = document.createElement('button');
      del.innerText = "×";
      del.style = "position:absolute; top:4px; right:8px; border:none; background:none; cursor:pointer; opacity:0.5; color:inherit; font-weight:bold; font-size:14px;";
      del.onclick = (e) => { e.stopPropagation(); removePostIt(item.id); };
      card.appendChild(del);
      listDiv.appendChild(card);
    });
  }

  // --- Main Loops ---
  setInterval(cleanAndInject, 1500);

  if (autoScrollEnabled) {
    const scrollLoop = () => {
      if (!chrome.runtime?.id || isInvalidated) return;
      const isTyping = ["TEXTAREA", "INPUT"].includes(document.activeElement.tagName) || document.activeElement.getAttribute("contenteditable") === "true";
      if (!isTyping) window.scrollBy({ top: 400, behavior: 'smooth' });
      setTimeout(scrollLoop, 4000);
    };
    scrollLoop();
  }
} // init関数の閉じ

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.enabled || changes.autoScroll || changes.analysisEnabled)) location.reload();
});