import type { TrackType, Intensity } from '@musicai/shared-types';
interface PromptFormData {
    prompt: string;
    type: TrackType;
    language: string;
    lyrics: string;
    bpm: number;
    intensity: Intensity;
}
interface PromptFormProps {
    onSubmit: (data: PromptFormData) => void;
    isSubmitting: boolean;
}
export declare function PromptForm({ onSubmit, isSubmitting }: PromptFormProps): JSX.Element;
export {};
//# sourceMappingURL=index.d.ts.map