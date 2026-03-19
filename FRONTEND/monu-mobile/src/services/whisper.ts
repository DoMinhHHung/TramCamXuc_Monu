const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const ASSEMBLY_URL = 'https://api.assemblyai.com/v2';

const GROQ_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';
const ASSEMBLY_KEY = process.env.EXPO_PUBLIC_ASSEMBLY_API_KEY ?? '';

export const transcribeAudio = async (uri: string): Promise<string> => {
    try {
        console.log('--- Đang thử với Groq ---');
        return await transcribeWithGroq(uri);
    } catch (error: any) {
        console.warn('Groq hết quota, đang dùng AssemblyAI dự phòng:', error.message);

        if (!ASSEMBLY_KEY) {
            throw new Error('Groq lỗi và AssemblyAI chưa được cấu hình key dự phòng!');
        }

        return await transcribeWithAssembly(uri);
    }
};

const transcribeWithGroq = async (uri: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', {
        uri,
        type: 'audio/m4a',
        name: 'recording.m4a',
    } as any);

    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'vi');

    const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_KEY}` },
        body: formData,
    });

    if (!response.ok) throw new Error(`Groq Error ${response.status}`);
    const data = await response.json();
    return data.text.trim();
};

const transcribeWithAssembly = async (uri: string): Promise<string> => {
    const audioBlob = await (await fetch(uri)).blob();
    const uploadRes = await fetch(`${ASSEMBLY_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: ASSEMBLY_KEY },
        body: audioBlob,
    });

    const { upload_url } = await uploadRes.json();

    const transRes = await fetch(`${ASSEMBLY_URL}/transcript`, {
        method: 'POST',
        headers: {
            Authorization: ASSEMBLY_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            audio_url: upload_url,
            language_code: 'vi',
        }),
    });

    const { id } = await transRes.json();
    
    let status = 'queued';
    let resultText = '';

    while (status !== 'completed' && status !== 'error') {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Đợi 1s check 1 lần
        const pollRes = await fetch(`${ASSEMBLY_URL}/transcript/${id}`, {
            headers: { Authorization: ASSEMBLY_KEY },
        });
        const pollData = await pollRes.json();
        status = pollData.status;
        if (status === 'completed') resultText = pollData.text;
        if (status === 'error') throw new Error('AssemblyAI Processing Error');
    }

    return resultText.trim();
};