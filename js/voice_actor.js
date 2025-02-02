// グローバルに取得した声優一覧を保持（selectActorで利用）
let actorsData = [];

// メイン表示部分の要素を取得
const actorCard = document.getElementById('actor');
const img = actorCard.querySelector('img');
const nameEl = actorCard.querySelector('h2');
const textarea = actorCard.querySelector('textarea');
const createAudioButton = document.getElementById('create-audio-btn');
const audioContainer = document.getElementById('audio-container');
const actorAudio = document.getElementById('actor-audio');
const downloadBtn = document.getElementById('download-btn');

/**
 * getActor()
 * 声優一覧を取得して表示する
 */
async function getActor() {
    try {
        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                'x-api-key': API_KEY
            }
        };

        const uri = 'https://api.nijivoice.com/api/platform/v1/voice-actors';
        const response = await fetch(uri, options);
        const data = await response.json();
        // グローバル変数に保持しておく
        actorsData = data.voiceActors;
        displayActors(data);
    } catch (err) {
        console.error(err);
    }
}

/**
 * getVoice()
 * 
 * 音声生成API（POST）
 * @param {*} id 
 * @param {*} message 
 * @returns 
 */
async function getVoice(id, message) {
    // message の値があれば終了
    if (!message.trim()) return;
    // TODO: params
    try {
        const params = {
            format: 'mp3',
            speed: '1.0',
            emotionalLevel: '0.1',
            soundDuration: '0.1',
            script: message,
        };

        const options = {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify(params)
        };

        const uri = `https://api.nijivoice.com/api/platform/v1/voice-actors/${id}/generate-voice`;
        console.log('POST:', uri);

        const response = await fetch(uri, options);
        const data = await response.json();
        console.log("音声データ: ", data);
        return data;
    } catch (err) {
        console.error("音声生成エラー: ", err);
    }
}

/**
 * selectActor()
 * 声優一覧の「選択」ボタンをクリックした際に、メインの表示部分を更新する
 * @param {string} id - 選択した声優のID
 */
function selectActor(id) {
    // 保持しているデータから対象の声優を探す
    const actor = actorsData.find(actor => actor.id === id);
    if (!actor) return;

    // 要素の内容を更新
    img.src = actor.smallImageUrl;
    img.alt = actor.name;
    nameEl.textContent = actor.name;
    textarea.placeholder = actor.sampleScript || '台本を入力してください';

    // 「音声作成＆再生」ボタンのクリックイベントを更新
    createAudioButton.onclick = () => {
        const message = document.getElementById('message').value;
        createVoice(actor.id, message);
    };

    // メインの Actor 表示部分にスムーススクロール
    actorCard.scrollIntoView({ behavior: 'smooth' });
}

function displayBlance(remainingBalance) {
    const balanceContainer = document.getElementById('balance');
    balanceContainer.textContent = `残高: ${remainingBalance}`;
}

/**
 * createVoice()
 * 
 * 指定した声優の音声生成を行い、生成された mp3 を再生・ダウンロードできるようにする
 * レスポンスは generatedVoice オブジェクトで、base64Audio, duration, remainingCredits が含まれる
 * @param {string} id - 声優のID
 * @param {HTMLElement} container - 生成された audio 要素を追加するコンテナ
 */
/**
 * createVoice()
 * 指定した声優の音声生成を行い、生成された mp3 を再生・ダウンロードできるようにする
 * レスポンスは generatedVoice オブジェクトで、audioFileUrl, audioFileDownloadUrl, remainingCredits が含まれる（例）
 * @param {string} id - 声優のID
 * @param {string} message - 台本（メッセージ）
 */
async function createVoice(id, message) {
    if (!message.trim()) return;

    const data = await getVoice(id, message);
    // レスポンスから生成されたオブジェクトを取得
    const { generatedVoice } = data;
    console.log(generatedVoice)
    if (generatedVoice && generatedVoice.audioFileUrl && generatedVoice.audioFileDownloadUrl) {
        // 事前に用意した audio タグとダウンロードリンクの src/href を更新するだけで中身をクリアしない
        actorAudio.src = generatedVoice.audioFileUrl;
        downloadBtn.href = generatedVoice.audioFileDownloadUrl;

        // 生成後の残クレジット数で残高表示を更新（もし取得できれば）
        if (typeof generatedVoice.remainingCredits === 'number') {
            displayBlance(generatedVoice.remainingCredits);
        }

        // もし audioContainer が非表示状態であれば、hidden クラスを削除して表示
        audioContainer.classList.remove('hidden');
    }
}

/**
 * getBalance()
 * 残高情報を取得して表示
 */
async function getBalance() {
    try {
        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                'x-api-key': API_KEY
            }
        };

        const uri = 'https://api.nijivoice.com/api/platform/v1/balances';
        const response = await fetch(uri, options);
        const data = await response.json();
        console.log(data)

        // data の構造に合わせて remainingBalance を取得
        const remainingBalance = data.balances.remainingBalance;
        displayBlance(remainingBalance);
    } catch (err) {
        console.error("残高取得エラー: ", err);
    }
}

/**
 * displayActors()
 * 声優一覧表示
 * @param {*} data - 取得した声優データオブジェクト
 */
function displayActors(data) {
    const actorListContainer = document.getElementById('actorList');
    actorListContainer.innerHTML = ''; // 既存データをクリア

    selectActor(data.voiceActors[0].id);

    data.voiceActors.forEach(actor => {
        // カードの外枠
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg shadow overflow-hidden flex flex-col';

        // 画像部分
        const img = document.createElement('img');
        img.src = actor.smallImageUrl;
        img.alt = actor.name;
        img.className = 'w-full h-96 object-cover object-top';

        // 内容部分
        const content = document.createElement('div');
        content.className = 'p-4 flex flex-col flex-grow';

        // 名前
        const nameEl = document.createElement('h2');
        nameEl.textContent = actor.name;
        nameEl.className = 'text-xl font-semibold mb-2';

        // サンプルスクリプト
        const scriptEl = document.createElement('p');
        scriptEl.textContent = actor.sampleScript;
        scriptEl.className = 'text-gray-700 mb-4 flex-grow';

        // 年齢・性別
        const extraInfo = document.createElement('p');
        extraInfo.textContent = `年齢: ${actor.age} / 性別: ${actor.gender}`;
        extraInfo.className = 'text-sm text-gray-500';

        // 選択ボタン（クリックでメイン表示を更新）
        const selectButton = document.createElement('button');
        selectButton.textContent = '選択';
        selectButton.className = 'mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600';
        selectButton.onclick = () => selectActor(actor.id);

        // 要素の組み立て
        content.appendChild(nameEl);
        content.appendChild(scriptEl);
        content.appendChild(extraInfo);
        content.appendChild(selectButton);

        card.appendChild(img);
        card.appendChild(content);

        // コンテナに追加
        actorListContainer.appendChild(card);
    });
}

// APIから各種データ取得
getActor();
getBalance();