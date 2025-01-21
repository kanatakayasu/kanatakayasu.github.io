/*****************************************************
 * main.js
 * - sessionStorageを使い、タブを閉じたらデータ削除
 * - 終了条件:
 *    (A) distance >= 9
 *    (B) "empty"含む
 *    (C) すでに distanceMap に登録済み
 * - セクション1で氏名, オブジェクト, 想起文章, 目的環境を入力
 *    ※ 目的環境に "in hand", "near body", "far from body" が
 *       含まれていたらエラーを表示し入力やり直し
 * - 目的環境=赤, 環境=オレンジ, 行動=青 (D3.js可視化、矢印付き)
 ****************************************************/
/**
 * デフォルト(初期)データ構造
 */
function getDefaultData() {
  return {
    // セクション1で入力する各種フィールド
    userName: "",         // 氏名
    objectItem: "",       // オブジェクト
    objectSentence: "",   // 想起される文章
    targetEnv: "",        // 目的環境
    edges: [],            // ネットワークエッジ
    distanceMap: {},      // 距離マップ
    // キューによる環境探索
    envQueue: [],
    currentEnv: null,
    currentAction: null,
    networkDescriptions: []
  };
}
/**
 * sessionStorageから読み込み
 */
function loadData() {
  let dataStr = sessionStorage.getItem('planningData');
  if (!dataStr) {
    const def = getDefaultData();
    sessionStorage.setItem('planningData', JSON.stringify(def));
    return def;
  }
  return JSON.parse(dataStr);
}
/**
 * sessionStorageに保存
 */
function saveData(data) {
  sessionStorage.setItem('planningData', JSON.stringify(data));
}
/**
 * データ初期化
 */
function resetAll() {
  sessionStorage.removeItem('planningData');
  location.href = 'index.html';
}
/*****************************************************
 * 終了条件チェック
 *   (1) distance >= 9
 *   (2) "empty"を含む
 *   (3) distanceMapに既に存在 (探索済み)
 *****************************************************/
function checkEnvTermination(data, envName, nextDistance) {
  if (nextDistance >= 9) return true;
  if (envName.toLowerCase().includes('empty')) return true;
  if (data.distanceMap[envName] !== undefined) return true;
  return false;
}
/*****************************************************
 * index.html
 *****************************************************/
function goToSection1() {
  location.href = 'section1.html';
}
/*****************************************************
 * section1.html
 * - 氏名(userName)
 * - オブジェクト(objectItem)
 * - 想起される文章(objectSentence)
 * - 目的環境(targetEnv)
 *   ↑ "in hand", "near body", "far from body" が
 *     含まれていたらエラー
 *****************************************************/
function saveSection1() {
  let d = loadData();
  // 各フィールドの値を取得
  const nameVal = document.getElementById('userName').value.trim();
  const objItem = document.getElementById('objectItem').value.trim();
  const objSentence = document.getElementById('objectSentence').value.trim();
  const env = document.getElementById('targetEnv').value.trim();
  // チェック(必須入力)
  if (!nameVal || !objItem || !objSentence || !env) {
    alert("未入力の項目があります。すべて入力してください。");
    return;
  }
  // 目的環境が禁止ワードを含むかどうかチェック
  const bannedStrings = ["in hand", "near body", "far from body"];
  for (let banned of bannedStrings) {
    if (env.toLowerCase().includes(banned)) {
      alert(`環境に禁止文字列「${banned}」が含まれています。修正してください。`);
      return;
    }
  }
  // OKなら保存
  d.userName = nameVal;
  d.objectItem = objItem;
  d.objectSentence = objSentence;
  d.targetEnv = env;
  // 目的環境のdistance=0
  d.distanceMap[env] = 0;
  // キューに追加
  d.envQueue = [env];
  saveData(d);
  // セクション2へ
  location.href = 'section2_start.html';
}
/*****************************************************
 * section2_start.html
 *****************************************************/
function initSection2Start() {
  let d = loadData();
  if (d.envQueue.length === 0) {
    // 環境キューが空 → ネットワーク構築完了
    document.getElementById('envContainer2').style.display = 'none';
    document.getElementById('noMoreEnv2').style.display = 'block';
    return;
  }
  let env = d.envQueue.shift();
  d.currentEnv = env;
  saveData(d);
  document.getElementById('currentEnv2').textContent = env;
}
/**
 * 行動を入力 → (action -> env)
 */
function saveActionSection2() {
  let d = loadData();
  let env = d.currentEnv;
  let action = document.getElementById('action2').value.trim();
  if (!action) return;
  d.edges.push({ source: action, target: env });
  let distEnv = d.distanceMap[env] || 0;
  let distAction = distEnv + 1;
  if (d.distanceMap[action] === undefined) {
    d.distanceMap[action] = distAction;
  }
  d.currentAction = action;
  saveData(d);
  location.href = 'section2_action_env.html';
}
/*****************************************************
 * section2_action_env.html
 *****************************************************/
function initSection2ActionEnv() {
  let d = loadData();
  document.getElementById('actionName2').textContent = d.currentAction || "(未入力)";
}
function saveRequiredEnvsSection2() {
  let d = loadData();
  let requiredStr = document.getElementById('requiredEnvs2').value.trim();
  if (!requiredStr) {
    saveData(d);
    location.href = 'section2_start.html';
    return;
  }
  let envList = requiredStr.split(',').map(e => e.trim()).filter(e => e !== '');
  let action = d.currentAction;
  let distAction = d.distanceMap[action] || 0;
  envList.forEach(env => {
    d.edges.push({ source: env, target: action });
    let nextDist = distAction + 1;
    if (!checkEnvTermination(d, env, nextDist)) {
      d.distanceMap[env] = nextDist;
      d.envQueue.push(env);
    }
  });
  saveData(d);
  location.href = 'section2_start.html';
}
/*****************************************************
 * finish.html
 *****************************************************/
function goToFinish() {
  location.href = 'finish.html';
}
function displayResult() {
  let d = loadData();
  let resultArea = document.getElementById('resultArea');
  let html = '<hr>';
  html += `<p>氏名: ${d.userName}</p>`;
  html += `<p>オブジェクト: ${d.objectItem}</p>`;
  html += `<p>オブジェクトに関連するタスク: ${d.objectSentence}</p>`;
  html += `<p>タスクを実行して達成される環境: ${d.targetEnv}</p>`;
  html += `<hr>`;
  // html += '<h3>エッジ一覧 (source → target)</h3><ul>';
  // d.edges.forEach(e => {
  //   html += `<li>${e.source} → ${e.target}</li>`;
  // });
  // html += '</ul>';
  // html += '<h3>距離マップ</h3><ul>';
  // for (let k in d.distanceMap) {
  //   html += `<li>${k} : ${d.distanceMap[k]}</li>`;
  // }
  // html += '</ul>';
  // 行動ノードまとめ
  let actionInfoArray = buildNetworkDescriptions(d);
  d.networkDescriptions = actionInfoArray;
  html += '<h3>ネットワーク構造（行動ノードごとの達成・必要環境）</h3><ul>';
  actionInfoArray.forEach(info => {
    html += '<li>';
    html += `行動ノード: <strong>${info.actionNode}</strong><br/>`;
    html += `&emsp;行動で達成される環境ノード: ${info.achieves.join(", ") || "(なし)"}<br/>`;
    html += `&emsp;行動に必要な環境ノード: ${info.requires.join(", ") || "(なし)"}<br/>`;
    html += '</li>';
  });
  html += '</ul>';
  resultArea.innerHTML = html;
  drawNetwork(d);
  saveData(d);
}
/** 行動ノードの達成環境 / 必要環境をまとめる */
function buildNetworkDescriptions(data) {
  const nodeSet = new Set();
  data.edges.forEach(e => {
    nodeSet.add(e.source);
    nodeSet.add(e.target);
  });
  for (let k in data.distanceMap) {
    nodeSet.add(k);
  }
  const nodes = Array.from(nodeSet);
  function isActionNode(name) {
    if (name === data.targetEnv) return false;
    if (name.toLowerCase().includes("empty")) return false;
    if (name.includes("env") || name.includes("hand") || name.includes("body")) return false;
    return true;
  }
  let actionNodes = nodes.filter(n => isActionNode(n));
  let results = [];
  actionNodes.forEach(action => {
    let achieves = [];
    let requires = [];
    data.edges.forEach(edge => {
      if (edge.source === action) {
        achieves.push(edge.target);
      } else if (edge.target === action) {
        requires.push(edge.source);
      }
    });
    results.push({ actionNode: action, achieves, requires });
  });
  return results;
}
/*****************************************************
 * D3.js可視化 (矢印付き)
 *****************************************************/
function drawNetwork(data) {
  let nodeSet = new Set();
  data.edges.forEach(e => {
    nodeSet.add(e.source);
    nodeSet.add(e.target);
  });
  for (const k in data.distanceMap) {
    nodeSet.add(k);
  }
  let nodes = Array.from(nodeSet).map(name => {
    if (name === data.targetEnv) {
      return { id: name, type: "targetEnv" };
    } else {
      if (name.toLowerCase().includes("empty") ||
          name.includes("env") ||
          name.includes("hand") ||
          name.includes("body")) {
        return { id: name, type: "environment" };
      } else {
        return { id: name, type: "action" };
      }
    }
  });
  let links = data.edges.map((e, i) => ({
    source: e.source,
    target: e.target,
    index: i
  }));
  const width = 800;
  const height = 600;
  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);
  svg.append("defs").append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 21)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#999");
  const simulation = d3.forceSimulation(nodes)
    .force("charge", d3.forceManyBody().strength(-200))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("link", d3.forceLink(links).id(d => d.id).distance(150))
    .on("tick", ticked);
  const link = svg.selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("stroke", "#999")
    .attr("stroke-width", 1.5)
    .attr("marker-end", "url(#arrowhead)");
  const node = svg.selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("r", 15)
    .attr("fill", d => {
      if (d.type === "targetEnv") return "red";
      else if (d.type === "environment") return "orange";
      else return "blue";
    })
    .call(drag(simulation));
  const label = svg.selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
    .text(d => d.id)
    .attr("font-size", 12)
    .attr("text-anchor", "middle")
    .attr("dy", 4);
  function ticked() {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);
    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);
    label
      .attr("x", d => d.x)
      .attr("y", d => d.y - 25);
  }
  function drag(simulation) {
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }
}
/*****************************************************
 * JSONファイルダウンロード
 *****************************************************/
function exportDataAsJson() {
  let p = loadData();
  let dataStr = JSON.stringify(p, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'planning_network_data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
