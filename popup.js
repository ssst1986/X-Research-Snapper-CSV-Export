const toggleBtn = document.getElementById("toggleBtn");
const scrollBtn = document.getElementById("scrollBtn");
const anaBtn = document.getElementById("anaBtn"); // 追加

// 現在の状態を読み込んで反映
chrome.storage.local.get(["enabled", "autoScroll", "analysisEnabled"], (res) => {
  updateToggleUI(res.enabled !== false);
  updateScrollUI(res.autoScroll === true);
  updateAnaUI(res.analysisEnabled !== false); // 追加
});

// メイン機能のON/OFF
toggleBtn.onclick = () => {
  chrome.storage.local.get("enabled", (res) => {
    const next = !(res.enabled !== false);
    chrome.storage.local.set({ enabled: next }, () => updateToggleUI(next));
  });
};

// オートスクロールのON/OFF
scrollBtn.onclick = () => {
  chrome.storage.local.get("autoScroll", (res) => {
    const next = !(res.autoScroll === true);
    chrome.storage.local.set({ autoScroll: next }, () => updateScrollUI(next));
  });
};

// 📊 分析モードのON/OFF（追加）
anaBtn.onclick = () => {
  chrome.storage.local.get("analysisEnabled", (res) => {
    const next = !(res.analysisEnabled !== false);
    chrome.storage.local.set({ analysisEnabled: next }, () => updateAnaUI(next));
  });
};

function updateToggleUI(isEnabled) {
  toggleBtn.innerText = isEnabled ? "全体機能: ON" : "全体機能: OFF";
  toggleBtn.className = isEnabled ? "on" : "off";
}

function updateScrollUI(isScrolling) {
  scrollBtn.innerText = isScrolling ? "スクロール: ON" : "スクロール: OFF";
  scrollBtn.className = isScrolling ? "on" : "off";
}

// 📊 分析モードのUI更新（追加）
function updateAnaUI(isEnabled) {
  anaBtn.innerText = isEnabled ? "分析モード: ON" : "分析モード: OFF";
  anaBtn.className = isEnabled ? "ana-on" : "ana-off";
}