// グローバルに取得した声優一覧を保持（selectActorで利用）
let actorsData = [];
let message = '';

// メイン表示部分の要素を取得
const messageContainer = document.getElementById('message');
const actorListContainer = document.getElementById('actorList');
const actorCard = document.getElementById('actor');
const actorImg = document.getElementById('actor-image');
const actorName = document.getElementById('actor-name');
const actorMessage = document.getElementById('actor-message');
const actorAudio = document.getElementById('actor-audio');
const createAudioButton = document.getElementById('create-audio-btn');
const audioContainer = document.getElementById('audio-container');
const downloadBtn = document.getElementById('download-btn');

const imageLoading = document.getElementById('image-loading');
const voiceLoading = document.getElementById('voice-loading');

/**
 * getActors()
 * 声優一覧APIを取得
 */
async function getActors() {
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
        console.log(data)
        return data.voiceActors;
    } catch (err) {
        console.error(err);
        messageContainer.textContent = '声優一覧の取得に失敗しました。';
    }
}

/**
 * getVoice()
 * 
 * 音声生成APIをPOSTして音声生成&取得
 * 
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
 * getBalance()
 * 
 * 残高情報APIを取得
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

        return data.balances.remainingBalance;
    } catch (err) {
        console.error("残高取得エラー: ", err);
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

    // 更新前に画像ローディング表示
    imageLoading.classList.remove('hidden');

    // 要素の内容を更新
    actorImg.src = actor.smallImageUrl;
    actorImg.alt = actor.name;
    actorName.textContent = actor.name;
    actorMessage.placeholder = actor.sampleScript || '台本を入力してください';
    // 初期音声はサンプル音声URLがあれば更新（なければそのまま）
    actorAudio.src = actor.sampleVoiceUrl || '';

    // 画像の読み込み完了時にローディングを非表示
    actorImg.onload = () => {
        imageLoading.classList.add('hidden');
        actorImg.classList.remove('invisible');
    };

    // 「音声作成＆再生」ボタンのクリックイベントを更新
    createAudioButton.onclick = () => {
        if (confirm('音声を生成しますか？\n生成にはクレジットが消費されます。')) {
            // 音声生成中はローディング表示
            voiceLoading.classList.remove('hidden');
            // ダウンロードリンクが表示されていたら非表示にする
            audioContainer.classList.add('hidden');
            // 音声生成APIを呼び出し
            createVoice(actor.id, actorMessage.value);
        }
    };

    // メインの Actor 表示部分にスムーススクロール
    actorCard.scrollIntoView({ behavior: 'smooth' });
}

/**
 * displayBlance()
 * 
 * クレジット残高
 * @param {*} remainingBalance 
 */
function displayBlance(remainingBalance) {
    const balanceContainer = document.getElementById('balance');
    balanceContainer.textContent = `残高: ${remainingBalance}`;
}

/**
 * createVoice()
 * 
 * 指定した声優の音声生成
 * mp3 を再生・ダウンロード
 * 
 * @param {string} id - 声優のID
 * @param {string} message - 台本（メッセージ）
 */
async function createVoice(id, text) {
    if (!text.trim()) return;

    const data = await getVoice(id, text);
    // レスポンスから生成されたオブジェクトを取得
    const { generatedVoice } = data;
    if (generatedVoice && generatedVoice.audioFileUrl && generatedVoice.audioFileDownloadUrl) {
        // 事前に用意した audio タグとダウンロードリンクの src/href を更新するだけで中身をクリアしない
        actorAudio.src = generatedVoice.audioFileUrl;
        downloadBtn.href = generatedVoice.audioFileDownloadUrl;

        // 生成後の残クレジット数で残高表示を更新（もし取得できれば）
        if (typeof generatedVoice.remainingCredits === 'number') {
            displayBlance(generatedVoice.remainingCredits);
        }

        // 表示済みのローディングを非表示
        voiceLoading.classList.add('hidden');
        // audioContainer は常に表示状態
        audioContainer.classList.remove('hidden');
    }
}


/**
 * displayActors()
 * 声優一覧表示
 * @param {*} data - 取得した声優データオブジェクト
 */
function displayActors(data) {
    // コンテナをクリア
    actorListContainer.innerHTML = '';

    // グローバル保持
    actorsData = data;

    // 先頭の声優を選択状態にする（任意）
    selectActor(actorsData[0].id);

    // 各声優の HTML をテンプレートリテラルで作成
    const html = actorsData
        .map(actor => {
            return `
        <div class="bg-white rounded-lg shadow overflow-hidden flex flex-col">
            <img src="${actor.smallImageUrl}" alt="${actor.name}" class="w-full h-96 object-cover object-top">
            <div class="p-4 flex flex-col flex-grow">
                <h2 class="text-xl font-semibold mb-2">${actor.name}</h2>
                <p class="text-gray-700 mb-4 flex-grow">${actor.sampleScript}</p>
                <p class="text-sm text-gray-500">
                    年齢: ${actor.age} 
                    / 
                    性別: ${actor.gender}
                </p>
                <button class="mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600" onclick="selectActor('${actor.id}')">選択</button>
            </div>
        </div>
        `;
        })
        .join('');

    // コンテナ更新
    actorListContainer.innerHTML = html;
}

// APIから各種データ取得
(async () => {
    const actorData = await getActors();
    displayActors(actorData);

    const remainingBalance = await getBalance();
    displayBlance(remainingBalance);
})();