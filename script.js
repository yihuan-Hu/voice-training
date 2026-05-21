// 全局变量
let currentVolunteer = null;
let isAdminAuthorized = false;
let pageHistory = ['loginPage']; // 页面历史记录
let isLoading = false; // 防止重复操作
let pendingVolunteerId = null; // 待确认的志愿者编号

// Supabase REST API 配置
const SUPABASE_URL = 'https://cwrltbmjfwbuobweruuh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cmx0Ym1qZndidW9id2VydXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjQxMzIsImV4cCI6MjA5NDcwMDEzMn0.frL4FZp0DZuMT8Fs68X-qu7IsXFCR7CUEUaX2__dnXs';
const DB_TABLE = 'check_records';
const VOLUNTEERS_TABLE = 'volunteers';

// 视频存储桶 URL（需要你在 Supabase 存储桶中上传视频后填入）
// 格式：https://xxx.supabase.co/storage/v1/object/public/你的桶名/
const VIDEO_BUCKET_URL = 'https://cwrltbmjfwbuobweruuh.supabase.co/storage/v1/object/public/videos/';

// REST API 封装
const db = {
    // 查询数据
    async select(filters = {}) {
        try {
            let url = `${SUPABASE_URL}/rest/v1/${DB_TABLE}?`;
            const params = [];
            if (filters.volunteer_id) params.push(`volunteer_id=eq.${filters.volunteer_id}`);
            if (filters.check_date) params.push(`check_date=eq.${filters.check_date}`);
            if (filters.select) params.push(`select=${filters.select}`);
            url += params.join('&');
            
            const response = await fetch(url, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.warn('数据库查询失败:', error);
            return [];
        }
    },
    
    // 插入或更新数据
    async upsert(data) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${DB_TABLE}`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return { success: true };
        } catch (error) {
            console.warn('数据库保存失败:', error);
            return { error: error.message };
        }
    },
    
    // 查询志愿者身份
    async getVolunteerType(volunteerId) {
        try {
            const url = `${SUPABASE_URL}/rest/v1/${VOLUNTEERS_TABLE}?volunteer_id=eq.${volunteerId}&select=*`;
            const response = await fetch(url, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (data && data.length > 0) {
                return {
                    is_music_student: data[0].is_music_student,
                    is_confirmed: data[0].is_confirmed
                };
            }
            return null;
        } catch (error) {
            console.warn('查询志愿者身份失败:', error);
            return null;
        }
    },
    
    // 保存志愿者身份
    async saveVolunteerType(volunteerId, isMusicStudent) {
        try {
            const data = {
                volunteer_id: volunteerId,
                is_music_student: isMusicStudent,
                is_confirmed: true,
                updated_at: new Date().toISOString()
            };
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${VOLUNTEERS_TABLE}`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return { success: true };
        } catch (error) {
            console.warn('保存志愿者身份失败:', error);
            return { error: error.message };
        }
    }
};

// 训练方案详细内容
// 视频路径配置（使用 Supabase 存储桶）

const trainingContents = {
    music: {
        week1_12: {
            title: "第1-12周：基础放松 + 科学发声",
            text: `
                <div class="warning">
                    <strong>⚠️ 核心前置原则（必读）</strong><br>
                    1. 绝对规避伤嗓行为：禁止频繁清嗓、硬咳、大喊、耳语式说话（耳语会加重声带闭合不全，比正常说话更伤嗓）、长时间连续用嗓不休息、感冒期强行用嗓；避开烟酒、辛辣刺激、干燥环境。女生生理期注意减少过度用嗓。<br>
                    2. 训练核心准则：所有训练全程喉部无发力、无刺痛、无酸胀感，若练完嗓子更累，说明方法错误，立即停止回归放松训练。发声发力点永远在腹部（呼吸）、唇齿舌（咬字）、咽腔（共鸣），喉部仅为声带振动的通道，绝非发力点。
                </div>
                <h4>🆘 应急修复与日常养护（了解学习即可）</h4>
                <div class="tip">
                    <strong>1. 严格声休，但不耳语：</strong>最好能完全闭嘴休息1-2小时。如果必须说话，用低沉正常的音量（不要耳语，耳语反而伤声带）。避免清嗓子，改为喝温水或做吞咽动作。<br><br>
                    <strong>2. 湿热蒸汽急救：</strong>倒一杯热水，口鼻凑近吸入蒸汽5-10分钟（注意防烫），或洗个热水澡。这是最快缓解发紧的方法。<br><br>
                    <strong>3. "吸管发声"减压：</strong>拿一根吸管插入水杯，对着吸管持续吹"呜——"，让气泡均匀冒出。做1-2分钟，能帮声带减压消肿。<br><br>
                    <strong>4. 热敷颈部：</strong>用温毛巾敷脖子前方喉结位置，每次5分钟，帮助放松喉部肌肉。
                </div>
                <h4>🎯 一、基础放松（每周3-4次，每次10-15分钟，唱歌后必做）</h4>
                <p><em>嗓音保健操，每个动作4个八拍</em></p>
                <ul>
                    <li><strong>抬头张嘴：</strong>下巴尽量不动，靠抬头来张嘴（可用手轻轻托住下巴辅助固定）。张嘴过程保持长方形的口型。边吸气，吸满气后停5秒，然后自然呼气，嘴唇稍用力保持长方形口型。</li>
                    <li><strong>绕唇：</strong>把嘴唇撅起做360°转动，左一圈，右一圈。开始练习时可以用手帮助嘴唇活动。</li>
                    <li><strong>舌尖绕唇：</strong>舌尖从口腔里面用力顶左右内颊，接着用力顶上下内唇，熟练后将舌尖放于嘴唇与牙齿之间，做360°转动。</li>
                    <li><strong>舌根伸缩：</strong>把食指和中指尽量并齐，放在喉结上方斜向上45°用力，手指用力同时舌头自然伸出口腔外。可解除舌根和声带的疲劳，缓解喉肌的紧张。</li>
                </ul>
                <h4>🎤 二、呼吸训练与科学发声模式重建</h4>
                <p>跟随专业老师的训练脚步，进行科学发声。建议配合腹式呼吸训练，为后续科学发声打好基础。</p>
            `,
            videoSections: ['videoSectionMusic'],
            videos: {
                relax: ['relax_1.mp4', 'relax_2.mp4', 'relax_3.mp4', 'relax_4.mp4']
            }
        }
    },
    nonMusic: {
        week1_2: {
            title: "第1-2周：基础放松训练",
            text: `
                <div class="warning">
                    <strong>⚠️ 核心前置原则（必读）</strong><br>
                    1. 绝对规避伤嗓行为：禁止频繁清嗓、硬咳、大喊、耳语式说话、长时间连续用嗓不休息；避开烟酒、辛辣刺激、干燥环境。<br>
                    2. 训练核心准则：所有训练全程喉部无发力、无刺痛、无酸胀感，若练完嗓子更累，说明方法错误，立即停止回归放松训练。
                </div>
                <h4>🆘 应急修复与日常养护（了解学习即可）</h4>
                <div class="tip">
                    <strong>1. 严格声休，但不耳语：</strong>最好能完全闭嘴休息1-2小时。如果必须说话，用低沉正常的音量（不要耳语，耳语反而伤声带）。避免清嗓子，改为喝温水或做吞咽动作。<br><br>
                    <strong>2. 湿热蒸汽急救：</strong>倒一杯热水，口鼻凑近吸入蒸汽5-10分钟（注意防烫），或洗个热水澡。<br><br>
                    <strong>3. "吸管发声"减压：</strong>拿一根吸管插入水杯，对着吸管持续吹"呜——"，让气泡均匀冒出。做1-2分钟，能帮声带减压消肿。<br><br>
                    <strong>4. 热敷颈部：</strong>用温毛巾敷脖子前方喉结位置，每次5分钟，帮助放松喉部肌肉。
                </div>
                <h4>🎯 基础放松（每周3-4次，每次10-15分钟）</h4>
                <p><em>嗓音保健操，每个动作4个八拍</em></p>
                <ul>
                    <li><strong>抬头张嘴：</strong>下巴尽量不动，靠抬头来张嘴（可用手轻轻托住下巴辅助固定）。张嘴过程保持长方形的口型。边吸气，吸满气后停5秒，然后自然呼气，嘴唇稍用力保持长方形口型。</li>
                    <li><strong>绕唇：</strong>把嘴唇撅起做360°转动，左一圈，右一圈。开始练习时可以用手帮助嘴唇活动。</li>
                    <li><strong>舌尖绕唇：</strong>舌尖从口腔里面用力顶左右内颊，接着用力顶上下内唇，熟练后将舌尖放于嘴唇与牙齿之间，做360°转动。</li>
                    <li><strong>舌根伸缩：</strong>把食指和中指尽量并齐，放在喉结上方斜向上45°用力，手指用力同时舌头自然伸出口腔外。可解除舌根和声带的疲劳，缓解喉肌的紧张。</li>
                </ul>
            `,
            videoSection: 'videoSection1_2',
            videos: {
                relax: ['relax_1.mp4', 'relax_2.mp4', 'relax_3.mp4', 'relax_4.mp4']
            }
        },
        week3_6: {
            title: "第3-6周：放松 + 呼吸训练",
            text: `
                <h4>🎯 一、放松训练（每个动作2个八拍）</h4>
                <ul>
                    <li><strong>抬头张嘴：</strong>下巴尽量不动，靠抬头来张嘴</li>
                    <li><strong>绕唇：</strong>把嘴唇撅起做360°转动，左一圈，右一圈</li>
                    <li><strong>舌尖绕唇：</strong>舌尖从口腔里面用力顶左右内颊，接着用力顶上下内唇</li>
                    <li><strong>舌根伸缩：</strong>把食指和中指并齐放在喉结上方斜向上45°用力，舌头自然伸出口腔外</li>
                </ul>
                <h4>🌬️ 二、呼吸训练（每周3-4次，每次10-15分钟）</h4>
                <ul>
                    <li><strong>基础呼吸训练：</strong>两脚左右分开，与肩同宽，站稳后上身自然挺拔，双手放在肋骨处。吸气时嘴张开，让气流从通道快速进入肺部，此时胸廓自然向前、向上抬起，胸腹部和腰部同时向四周扩张。吸满后，保持这种吸气状态两秒，然后快速将气全部吐出。慢吸-绷住-快呼，此过程为一组，每次4组。注意全程喉部无憋气感，练到日常说话可自然饱满的吸气。</li>
                    <li><strong>控气稳气训练：</strong>张嘴打开喉咙吸气4秒，匀速发「嘶——」，保持气息平稳无波动，尽量拉长时长，目标达到20秒以上，每次4组。注意要均匀吸气，尽量吸满，但不要吸撑使喉部紧绷。</li>
                    <li><strong>小狗哈气：</strong>将舌头吐出，舌尖轻轻搭于下嘴唇，且舌根无拉扯感。将手轻放至小腹处，在此基础上，模仿小狗哈气动作，吸气至腹部（如练习1），体会腹部快速收放的对抗感。一组15秒，每次2-3组。注意，肩膀及胸部无抖动，完全放松，仅腹部作为动力源。</li>
                </ul>
            `,
            videoSections: ['videoSection3_6_relax', 'videoSection3_6_breath'],
            videos: {
                relax: ['relax_1.mp4', 'relax_2.mp4', 'relax_3.mp4', 'relax_4.mp4'],
                breath: ['nonmusic_week3_6_breath_1.mp4', 'nonmusic_week3_6_breath_2.mp4', 'nonmusic_week3_6_breath_3.mp4']
            }
        },
        week7_10: {
            title: "第7-10周：放松 + 科学发声重建",
            text: `
                <h4>🎯 一、放松训练（每个动作2个八拍）</h4>
                <ul>
                    <li><strong>抬头张嘴：</strong>下巴尽量不动，靠抬头来张嘴</li>
                    <li><strong>绕唇：</strong>把嘴唇撅起做360°转动，左一圈，右一圈</li>
                    <li><strong>舌尖绕唇：</strong>舌尖从口腔里面用力顶左右内颊，接着用力顶上下内唇</li>
                    <li><strong>舌根伸缩：</strong>把食指和中指并齐放在喉结上方斜向上45°用力，舌头自然伸出口腔外</li>
                </ul>
                <h4>🎤 二、科学发声模式重建（每周3-4次，每次10-15分钟）</h4>
                <ul>
                    <li><strong>吸管共鸣训练法：</strong>准备一根普通塑料吸管（直径0.5-1cm，长度10-15cm，无需特殊规格，如奶茶细吸管），嘴唇轻含吸管前端（无需咬紧，避免唇部紧张），保持喉部完全放松，借助腹式呼吸支撑，缓慢发「u」「o」等圆唇元音，气息匀速通过吸管，感受吸管内气流的振动，全程喉部无发力、无酸胀。基础训练每组30秒，每次8组（4组长音+4组滑音）。注意喉部及唇部需保持完全放松，声音位置靠前。</li>
                    <li><strong>半打哈欠训练：</strong>先打一个哈欠，感受喉咙打开，上颚抬起的感觉，保持喉咙打开的状态，依次发「a、e、i、o、u」，震动集中在上牙膛（硬腭），而非喉部声带处，每次5组。</li>
                </ul>
            `,
            videoSections: ['videoSection7_10_relax', 'videoSection7_10_vocal'],
            videos: {
                relax: ['relax_1.mp4', 'relax_2.mp4', 'relax_3.mp4', 'relax_4.mp4'],
                vocal: ['nonmusic_week7_10_vocal_1.mp4', 'nonmusic_week7_10_vocal_2.mp4']
            }
        },
        week11_12: {
            title: "第11-12周：咬字 + 吐字归音训练",
            text: `
                <h4>🎯 一、咬字训练</h4>
                <p>练习绕口令（详见吐字归音训练），感受各种音型的发音状态（如唇齿音、舌尖音等），每次一组。注意把咬字发力点放在唇齿舌，而非喉部。</p>
                <h4>🗣️ 二、吐字归音训练</h4>
                <div class="tip">
                    <strong>（1）双唇音：b、p、m</strong><br>
                    八百标兵奔北坡，<br>
                    炮兵并排北边跑。<br>
                    炮兵怕把标兵碰，<br>
                    标兵怕碰炮兵炮。
                </div>
                <div class="tip">
                    <strong>（2）唇齿音：f</strong><br>
                    粉红墙上画凤凰，<br>
                    凤凰画在粉红墙。<br>
                    红凤凰，黄凤凰，<br>
                    粉红凤凰花凤凰。
                </div>
                <div class="tip">
                    <strong>（3）舌尖音：d、t、n、l</strong><br>
                    白石塔，<br>
                    白石搭，<br>
                    白石搭白塔，<br>
                    白塔白石搭，<br>
                    搭好白石塔，<br>
                    白塔白又大。
                </div>
                <div class="tip">
                    <strong>（4）舌根音：g、k、h</strong><br>
                    哥挎瓜筐过宽沟，<br>
                    过沟筐破瓜滚沟。<br>
                    隔沟够瓜瓜筐扣，<br>
                    瓜滚筐空哥怪沟。
                </div>
                <div class="tip">
                    <strong>（5）舌面音：j、q、x</strong><br>
                    七加一，七减一，<br>
                    加完减完等于几？<br>
                    七加一，七减一，<br>
                    加完减完还是七。
                </div>
                <h4>🎯 三、放松训练（每个动作2个八拍）</h4>
                <ul>
                    <li><strong>抬头张嘴：</strong>下巴尽量不动，靠抬头来张嘴</li>
                    <li><strong>绕唇：</strong>把嘴唇撅起做360°转动，左一圈，右一圈</li>
                    <li><strong>舌尖绕唇：</strong>舌尖从口腔里面用力顶左右内颊，接着用力顶上下内唇</li>
                    <li><strong>舌根伸缩：</strong>把食指和中指并齐放在喉结上方斜向上45°用力，舌头自然伸出口腔外</li>
                </ul>
            `,
            videoSection: 'videoSection11_12',
            videos: {
                relax: ['relax_1.mp4', 'relax_2.mp4', 'relax_3.mp4', 'relax_4.mp4']
            }
        }
    }
};

// 初始化
function init() {
    // 预先填充训练内容，让页面显示默认内容（登录页不需要加载数据）
    const musicContent = trainingContents.music.week1_12;
    if (musicContent) {
        document.getElementById('trainingTextMusic').innerHTML = musicContent.text;
    }
    const nonMusicContent = trainingContents.nonMusic.week1_2;
    if (nonMusicContent) {
        document.getElementById('trainingTextNonMusic').innerHTML = nonMusicContent.text;
    }
}

// 登录
async function login() {
    const volunteerId = document.getElementById('volunteerId').value.trim();
    
    if (!volunteerId) {
        alert('请输入志愿者编号！');
        return;
    }
    
    // 禁用登录按钮，防止重复点击
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.disabled = true;
    loginBtn.textContent = '加载中...';
    
    try {
        // 1. 查询志愿者身份（先查本地，再查云端）
        const localType = localStorage.getItem(`voice_user_type_${volunteerId}`);
        let isMusicStudent = null;
        
        if (localType) {
            // 本地有记录，直接使用
            isMusicStudent = localType === 'music';
            console.log('从本地读取身份:', isMusicStudent ? '声乐学生' : '非声乐学生');
        } else {
            // 本地没有，查云端
            const cloudData = await db.getVolunteerType(volunteerId);
            if (cloudData) {
                isMusicStudent = cloudData.is_music_student;
                localStorage.setItem(`voice_user_type_${volunteerId}`, isMusicStudent ? 'music' : 'non_music');
                console.log('从云端读取身份:', isMusicStudent ? '声乐学生' : '非声乐学生');
            }
        }
        
        // 2. 如果没有身份记录，弹出确认框
        if (isMusicStudent === null) {
            const confirmMsg = `欢迎 ${volunteerId}！\n\n请确认您的身份：\n- 点击「确定」= 声乐学生\n- 点击「取消」= 非声乐学生\n\n（身份确认后无法自行修改，如需更改请联系管理员）`;
            
            isMusicStudent = confirm(confirmMsg);
            
            // 3. 保存身份到云端和本地
            await db.saveVolunteerType(volunteerId, isMusicStudent);
            localStorage.setItem(`voice_user_type_${volunteerId}`, isMusicStudent ? 'music' : 'non_music');
            console.log('新用户身份已保存:', isMusicStudent ? '声乐学生' : '非声乐学生');
        }
        
        // 4. 加载打卡数据
        await loadUserCheckData(volunteerId, isMusicStudent);
        
    } catch (error) {
        console.error('登录失败:', error);
        alert('登录失败，请检查网络连接后重试！');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = '开始训练 →';
    }
}

// 加载用户打卡数据
async function loadUserCheckData(volunteerId, isMusicStudent) {
    const localKey = `voice_training_${volunteerId}`;
    const localData = JSON.parse(localStorage.getItem(localKey) || '{}');
    
    // 从云端同步数据
    try {
        const cloudData = await db.select({ volunteer_id: volunteerId });
        if (cloudData && cloudData.length > 0) {
            const mergedData = {};
            cloudData.forEach(record => {
                mergedData[record.check_date] = {
                    date: record.check_date,
                    status: record.status,
                    timestamp: record.timestamp,
                    week: record.week
                };
            });
            // 合并数据
            Object.assign(localData, mergedData);
            localStorage.setItem(localKey, JSON.stringify(localData));
        }
    } catch (e) {
        console.warn('云端同步失败，使用本地数据:', e);
    }
    
    currentVolunteer = {
        id: volunteerId,
        isMusicStudent: isMusicStudent,
        checkData: localData
    };
    
    showTrainingPage();
}

function showTrainingPage() {
    if (currentVolunteer.isMusicStudent) {
        document.getElementById('trainingPageMusic').classList.add('active');
        document.getElementById('trainingPageNonMusic').classList.remove('active');
        document.getElementById('loginPage').classList.remove('active');
        document.getElementById('calendarPage').classList.remove('active');
        updateTrainingContent('music');
    } else {
        document.getElementById('trainingPageMusic').classList.remove('active');
        document.getElementById('trainingPageNonMusic').classList.add('active');
        document.getElementById('loginPage').classList.remove('active');
        document.getElementById('calendarPage').classList.remove('active');
        updateTrainingContent('nonMusic');
    }
}

function updateTrainingContent(type) {
    let weekKey, content;
    
    if (type === 'music') {
        weekKey = document.getElementById('weekSelectMusic').value;
        content = trainingContents.music[weekKey];
        if (content) {
            document.getElementById('trainingTextMusic').innerHTML = content.text;
            
            // 隐藏所有视频区域
            hideAllVideoSections();
            
            // 显示声乐学生视频区域
            if (content.videoSections) {
                content.videoSections.forEach((sectionId) => {
                    const section = document.getElementById(sectionId);
                    if (section) {
                        section.style.display = 'block';
                        const videos = content.videos.relax;
                        if (videos) {
                            const videoElements = section.querySelectorAll('video');
                            videos.forEach((videoName, i) => {
                                if (videoElements[i]) {
                                    const source = videoElements[i].querySelector('source');
                                    if (source) {
                                        // 使用 Supabase 存储桶 URL
                                        source.src = VIDEO_BUCKET_URL + videoName;
                                        videoElements[i].load();
                                    }
                                }
                            });
                        }
                    }
                });
            }
        }
    } else {
        weekKey = document.getElementById('weekSelectNonMusic').value;
        content = trainingContents.nonMusic[weekKey];
        if (content) {
            document.getElementById('trainingTextNonMusic').innerHTML = content.text;
            
            // 隐藏所有视频区域
            hideAllVideoSections();
            
            // 根据周数显示对应的视频区域并加载视频
            if (content.videoSections) {
                // 多个视频区域
                content.videoSections.forEach((sectionId) => {
                    const section = document.getElementById(sectionId);
                    if (section) {
                        section.style.display = 'block';
                        // 根据视频类型获取对应的视频数组
                        const videoType = sectionId.includes('relax') ? 'relax' : 
                                         sectionId.includes('breath') ? 'breath' : 'vocal';
                        const videos = content.videos[videoType];
                        if (videos) {
                            // 获取该区域下的所有视频元素
                            const videoIds = section.querySelectorAll('video');
                            videos.forEach((videoName, i) => {
                                if (videoIds[i]) {
                                    const source = videoIds[i].querySelector('source');
                                    if (source) {
                                        // 使用 Supabase 存储桶 URL
                                        source.src = VIDEO_BUCKET_URL + videoName;
                                        videoIds[i].load();
                                    }
                                }
                            });
                        }
                    }
                });
            } else if (content.videoSection) {
                // 单个视频区域
                const section = document.getElementById(content.videoSection);
                if (section) {
                    section.style.display = 'block';
                    const videos = content.videos.relax;
                    if (videos) {
                        const videoIds = section.querySelectorAll('video');
                        videos.forEach((videoName, i) => {
                            if (videoIds[i]) {
                                const source = videoIds[i].querySelector('source');
                                if (source) {
                                    // 使用 Supabase 存储桶 URL
                                    source.src = VIDEO_BUCKET_URL + videoName;
                                    videoIds[i].load();
                                }
                            }
                        });
                    }
                }
            }
        }
    }
}

// 隐藏所有视频区域
function hideAllVideoSections() {
    const sections = document.querySelectorAll('.video-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
}

async function completeTraining(type) {
    if (isLoading) return;
    isLoading = true;
    
    // 使用本地时间而不是 UTC 时间
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    if (currentVolunteer.checkData[today]) {
        alert('今天已经打卡过了！继续坚持！');
        isLoading = false;
        return;
    }
    
    let currentWeek = '';
    if (type === 'music') {
        currentWeek = document.getElementById('weekSelectMusic').options[document.getElementById('weekSelectMusic').selectedIndex].text;
    } else {
        currentWeek = document.getElementById('weekSelectNonMusic').options[document.getElementById('weekSelectNonMusic').selectedIndex].text;
    }
    
    const newRecord = {
        volunteer_id: currentVolunteer.id,
        check_date: today,
        is_music_student: currentVolunteer.isMusicStudent,
        status: '已打卡',
        week: currentWeek,
        timestamp: new Date().toISOString()
    };
    
    // 同时保存到本地和云端
    currentVolunteer.checkData[today] = {
        date: today,
        status: '已打卡',
        timestamp: newRecord.timestamp,
        week: currentWeek
    };
    
    const localKey = `voice_training_${currentVolunteer.id}`;
    localStorage.setItem(localKey, JSON.stringify(currentVolunteer.checkData));
    
    // 保存到云端
    try {
        console.log('开始保存到云端...');
        console.log('保存数据:', newRecord);
        const cloudResult = await db.upsert(newRecord);
        console.log('云端返回结果:', cloudResult);
        if (cloudResult.error) {
            console.warn('⚠️ 云端保存失败，已保存到本地');
        } else {
            console.log('✅ 云端保存成功');
        }
    } catch (e) {
        console.error('云端保存出错:', e);
    }
    
    alert('✅ 打卡成功！继续加油！');
    
    // 刷新日历（如果在日历页面）
    if (document.getElementById('calendarPage').classList.contains('active')) {
        generateCalendar();
        updateStatistics();
    }
    
    isLoading = false;
}

async function goToCalendar() {
    const userInfoDiv = document.getElementById('userInfo');
    const typeText = currentVolunteer.isMusicStudent ? '🎵 声乐学生' : '🗣️ 非声乐学生';
    userInfoDiv.innerHTML = `👤 ${currentVolunteer.id} | ${typeText}`;
    
    // 尝试从云端刷新数据
    try {
        const cloudData = await db.select({ volunteer_id: currentVolunteer.id });
        if (cloudData && cloudData.length > 0) {
            const mergedData = {};
            cloudData.forEach(record => {
                mergedData[record.check_date] = {
                    date: record.check_date,
                    status: record.status,
                    timestamp: record.timestamp,
                    week: record.week
                };
            });
            // 合并并保存
            Object.assign(currentVolunteer.checkData, mergedData);
            const localKey = `voice_training_${currentVolunteer.id}`;
            localStorage.setItem(localKey, JSON.stringify(currentVolunteer.checkData));
        }
    } catch (e) {
        console.warn('云端同步失败:', e);
    }
    
    // 初始化月份选择器
    initMonthSelector();
    generateCalendar();
    updateStatistics();
    switchPage('calendarPage');
}

// 初始化月份选择器
function initMonthSelector() {
    const monthSelect = document.getElementById('monthSelect');
    if (!monthSelect) return;
    
    monthSelect.innerHTML = '';
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // 生成最近6个月的选项
    for (let i = 0; i < 6; i++) {
        const date = new Date(currentYear, currentMonth - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth();
        const value = `${year}-${String(month + 1).padStart(2, '0')}`;
        const text = `${year}年${month + 1}月`;
        
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        if (i === 0) option.selected = true;
        monthSelect.appendChild(option);
    }
}

function generateCalendar() {
    const calendarDiv = document.getElementById('calendar');
    calendarDiv.innerHTML = '';
    
    // 获取选中的月份
    const monthSelect = document.getElementById('monthSelect');
    const selectedMonth = monthSelect ? monthSelect.value : null;
    
    let year, month;
    if (selectedMonth) {
        [year, month] = selectedMonth.split('-').map(Number);
        month = month - 1; // 转换为0-11
    } else {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth();
    }
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    weekdays.forEach(weekday => {
        const weekdayDiv = document.createElement('div');
        weekdayDiv.textContent = weekday;
        weekdayDiv.style.fontWeight = 'bold';
        weekdayDiv.style.textAlign = 'center';
        weekdayDiv.style.padding = '8px';
        weekdayDiv.style.color = '#667eea';
        calendarDiv.appendChild(weekdayDiv);
    });
    
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    for (let i = 0; i < startWeekday; i++) {
        const emptyDiv = document.createElement('div');
        calendarDiv.appendChild(emptyDiv);
    }
    
    const today = new Date();
    const isCurrentMonth = (today.getFullYear() === year && today.getMonth() === month);
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        
        // 如果是今天，添加特殊样式
        if (isCurrentMonth && day === today.getDate()) {
            dayDiv.style.border = '2px solid #667eea';
            dayDiv.style.borderRadius = '8px';
        }
        
        const dateSpan = document.createElement('div');
        dateSpan.className = 'date';
        dateSpan.textContent = `${month + 1}/${day}`;
        
        const statusSpan = document.createElement('div');
        statusSpan.className = 'status';
        
        if (currentVolunteer.checkData[date]) {
            statusSpan.textContent = '✅ 已打卡';
            statusSpan.classList.add('status-checked');
        } else {
            // 如果是今天的日期，显示不同的状态
            if (isCurrentMonth && day === today.getDate()) {
                statusSpan.textContent = '📍 今日';
                statusSpan.classList.add('status-unchecked');
            } else {
                statusSpan.textContent = '❌ 未打卡';
                statusSpan.classList.add('status-unchecked');
            }
        }
        
        dayDiv.appendChild(dateSpan);
        dayDiv.appendChild(statusSpan);
        calendarDiv.appendChild(dayDiv);
    }
}

// 切换月份时重新生成日历
function changeMonth() {
    generateCalendar();
}


function updateStatistics() {
    const statsDiv = document.getElementById('trainingStats');
    const records = Object.values(currentVolunteer.checkData);
    const totalDays = records.length;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentMonthRecords = records.filter(r => new Date(r.date).getMonth() === currentMonth);
    
    let consecutiveDays = 0;
    // 使用本地时间
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    let checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    while (true) {
        const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
        if (currentVolunteer.checkData[dateStr]) {
            consecutiveDays++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    statsDiv.innerHTML = `
        <p>📊 总打卡天数：<strong>${totalDays}</strong> 天</p>
        <p>📅 本月打卡：<strong>${currentMonthRecords.length}</strong> 天</p>
        <p>🔥 连续打卡：<strong>${consecutiveDays}</strong> 天</p>
        <p>🎯 训练目标：每周3-4次，每次10-15分钟</p>
    `;
}

function backToTraining() {
    showTrainingPage();
}

function logout() {
    currentVolunteer = null;
    switchPage('loginPage');
    document.getElementById('volunteerId').value = '';
}

function switchPage(pageId) {
    const pages = ['loginPage', 'trainingPageMusic', 'trainingPageNonMusic', 'calendarPage'];
    const currentPage = pages.find(page => document.getElementById(page)?.classList.contains('active'));
    
    // 记录历史（不重复添加相同页面）
    if (pageId !== currentPage) {
        if (pageHistory[pageHistory.length - 1] !== pageId) {
            pageHistory.push(pageId);
        }
    }
    
    pages.forEach(page => {
        const element = document.getElementById(page);
        if (element) element.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    
    updateBackButton();
}

// 返回上一页
function goBack() {
    if (pageHistory.length > 1) {
        pageHistory.pop(); // 移除当前页
        const previousPage = pageHistory[pageHistory.length - 1];
        switchPageWithoutHistory(previousPage);
    }
}

// 切换页面但不记录历史（用于返回功能）
function switchPageWithoutHistory(pageId) {
    const pages = ['loginPage', 'trainingPageMusic', 'trainingPageNonMusic', 'calendarPage'];
    pages.forEach(page => {
        const element = document.getElementById(page);
        if (element) element.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    updateBackButton();
}

// 更新返回按钮状态
function updateBackButton() {
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.style.display = pageHistory.length > 1 ? 'inline-block' : 'none';
    }
}

// 监听浏览器返回按钮
window.addEventListener('popstate', function() {
    if (pageHistory.length > 1) {
        pageHistory.pop();
        const previousPage = pageHistory[pageHistory.length - 1];
        switchPageWithoutHistory(previousPage);
    }
});

// 管理员功能：从云端加载所有数据
async function loadAllCheckData() {
    try {
        const allData = {};
        // 直接使用完整 URL 查询所有数据
        const url = `${SUPABASE_URL}/rest/v1/${DB_TABLE}?select=*`;
        console.log('管理员查询 URL:', url);
        
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error('HTTP 错误:', response.status, response.statusText);
            alert(`❌ 数据加载失败：HTTP ${response.status}\n请检查 Supabase 配置是否正确`);
            return {};
        }
        
        const data = await response.json();
        console.log('管理员查询结果:', data);
        
        if (!data || data.length === 0) {
            console.warn('云端暂无打卡数据');
            return {};
        }
        
        data.forEach(record => {
            if (!allData[record.volunteer_id]) {
                allData[record.volunteer_id] = {
                    id: record.volunteer_id,
                    isMusicStudent: record.is_music_student,
                    checkRecords: {},
                    lastUpdate: record.timestamp
                };
            }
            allData[record.volunteer_id].checkRecords[record.check_date] = {
                date: record.check_date,
                status: record.status,
                timestamp: record.timestamp,
                week: record.week
            };
        });
        
        return allData;
    } catch (error) {
        console.error('加载数据失败:', error);
        alert(`❌ 数据加载失败：${error.message}\n请检查网络连接`);
        return {};
    }
}

// 保存到管理员文件
function saveToAdminFile(volunteerId, data) {
    // 现在主要使用 Supabase，本地存储作为备用
    const key = `voice_training_${volunteerId}`;
    localStorage.setItem(key, JSON.stringify(data));
}

function generateAdminReport(allData) {
    let report = '========== 嗓音训练打卡系统报告 ==========\n';
    report += `生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;
    
    for (const [volunteerId, data] of Object.entries(allData)) {
        report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        report += `志愿者编号：${volunteerId}\n`;
        report += `学员类型：${data.isMusicStudent ? '声乐学生' : '非声乐学生'}\n`;
        report += `最后更新：${new Date(data.lastUpdate).toLocaleString('zh-CN')}\n`;
        report += `打卡记录：\n`;
        
        for (const [date, record] of Object.entries(data.checkRecords)) {
            report += `  📅 ${date}: ${record.status}\n`;
            if (record.week) report += `     训练内容：${record.week}\n`;
        }
        report += `\n`;
    }
    
    return report;
}

function showAdminLogin() {
    const password = prompt('🔐 请输入管理员密码：');
    if (password === '123456') {
        isAdminAuthorized = true;
        adminDownloadReport();
    } else if (password !== null) {
        alert('❌ 密码错误');
    }
}

async function adminDownloadReport() {
    if (!isAdminAuthorized) {
        alert('🔒 请先通过管理员入口验证');
        return;
    }
    
    try {
        const allData = await loadAllCheckData();
        const volunteerCount = Object.keys(allData).length;
        
        if (volunteerCount === 0) {
            alert('暂无打卡数据');
            isAdminAuthorized = false;
            return;
        }
        
        const report = generateAdminReport(allData);
        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        a.href = url;
        a.download = `嗓音训练报告_${dateStr}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        alert(`✅ 报告已下载！共 ${volunteerCount} 位志愿者`);
    } catch (error) {
        console.error('生成报告失败:', error);
        alert('❌ 生成报告失败，请重试');
    }
    
    isAdminAuthorized = false;
}

window.login = login;
window.completeTraining = completeTraining;
window.goToCalendar = goToCalendar;
window.backToTraining = backToTraining;
window.logout = logout;
window.showAdminLogin = showAdminLogin;
window.adminDownloadReport = adminDownloadReport;
window.updateTrainingContent = updateTrainingContent;
window.changeMonth = changeMonth;

document.addEventListener('DOMContentLoaded', init);