import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Input, Select, Textarea, Caption, Button, } from '@telegram-apps/telegram-ui';
const TRACK_TYPES = [
    { value: 'full_song', label: 'Full Song (up to 3 min)' },
    { value: 'clip', label: 'Clip (30 sec)' },
    { value: 'instrumental', label: 'Instrumental' },
];
const LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'de', label: 'German' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'hi', label: 'Hindi' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
    { value: 'pt', label: 'Portuguese' },
];
const INTENSITIES = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'epic', label: 'Epic' },
];
export function PromptForm({ onSubmit, isSubmitting }) {
    const [prompt, setPrompt] = useState('');
    const [type, setType] = useState('full_song');
    const [language, setLanguage] = useState('en');
    const [lyrics, setLyrics] = useState('');
    const [bpm, setBpm] = useState(120);
    const [intensity, setIntensity] = useState('medium');
    const [promptError, setPromptError] = useState('');
    const handleSubmit = () => {
        if (prompt.length < 10) {
            setPromptError('Prompt must be at least 10 characters');
            return;
        }
        if (prompt.length > 1000) {
            setPromptError('Prompt must be at most 1000 characters');
            return;
        }
        if (lyrics.length > 2000) {
            setPromptError('Lyrics must be at most 2000 characters');
            return;
        }
        if (bpm < 60 || bpm > 200) {
            setPromptError('BPM must be between 60 and 200');
            return;
        }
        setPromptError('');
        onSubmit({
            prompt,
            type,
            language,
            lyrics: lyrics.trim() || undefined,
            bpm,
            intensity,
        });
    };
    return (_jsxs("div", { className: "space-y-4 p-4", children: [_jsxs("div", { children: [_jsx(Textarea, { placeholder: "Describe the music you want to create...", value: prompt, onChange: (e) => setPrompt(e.target.value), rows: 3 }), _jsxs("div", { className: "flex justify-between mt-1", children: [_jsxs(Caption, { className: "text-gray-500", children: [prompt.length, "/1000"] }), promptError && (_jsx(Caption, { className: "text-red-500", children: promptError }))] })] }), _jsxs("div", { children: [_jsx(Caption, { className: "text-gray-500 mb-1", children: "Track Type" }), _jsx(Select, { value: type, onChange: (e) => setType(e.target.value), children: TRACK_TYPES.map((t) => (_jsx("option", { value: t.value, children: t.label }, t.value))) })] }), _jsxs("div", { children: [_jsx(Caption, { className: "text-gray-500 mb-1", children: "Language" }), _jsx(Select, { value: language, onChange: (e) => setLanguage(e.target.value), children: LANGUAGES.map((l) => (_jsx("option", { value: l.value, children: l.label }, l.value))) })] }), _jsxs("div", { children: [_jsx(Caption, { className: "text-gray-500 mb-1", children: "Lyrics (optional)" }), _jsx(Textarea, { placeholder: "Enter custom lyrics or leave empty for AI-generated lyrics", value: lyrics, onChange: (e) => setLyrics(e.target.value), rows: 4 }), _jsxs(Caption, { className: "text-gray-500 mt-1", children: [lyrics.length, "/2000"] })] }), _jsxs("div", { children: [_jsxs(Caption, { className: "text-gray-500 mb-1", children: ["BPM: ", bpm] }), _jsx(Input, { type: "range", min: 60, max: 200, value: bpm, onChange: (e) => setBpm(Number(e.target.value)), className: "w-full" })] }), _jsxs("div", { children: [_jsx(Caption, { className: "text-gray-500 mb-1", children: "Intensity" }), _jsx(Select, { value: intensity, onChange: (e) => setIntensity(e.target.value), children: INTENSITIES.map((i) => (_jsx("option", { value: i.value, children: i.label }, i.value))) })] }), _jsx(Button, { stretched: true, mode: "primary", onClick: handleSubmit, loading: isSubmitting, disabled: isSubmitting || prompt.length < 10, children: "Create Track" })] }));
}
//# sourceMappingURL=index.js.map