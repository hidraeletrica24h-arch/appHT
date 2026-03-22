import React from 'react';

interface UseAIVoiceProps {
  context: 'client' | 'service' | 'material' | 'package' | 'budget';
  onSuccess: (data: any) => void;
  onError?: (error: string) => void;
}

export function useAIVoice({ context, onSuccess, onError }: UseAIVoiceProps) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [isProcessingAI, setIsProcessingAI] = React.useState(false);
  const recognitionRef = React.useRef<any>(null);

  const toggleRecording = () => {
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador atual não suporta gravação de voz nativa. Tente usar o Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = false;

    let finalTranscript = '';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
    };

    recognition.onend = async () => {
      setIsRecording(false);
      
      const textToProcess = finalTranscript.trim();
      if (!textToProcess) return;

      setIsProcessingAI(true);
      try {
        const { processVoiceCommand } = await import('../lib/gemini');
        const responseData = await processVoiceCommand(textToProcess, context);
        onSuccess(responseData);
      } catch (err: any) {
        if (onError) {
          onError(err.message);
        } else {
          alert('Erro na IA: ' + err.message);
        }
      } finally {
        setIsProcessingAI(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Voice Error:", event.error);
      if (event.error !== 'no-speech') {
        const msg = "Houve um problema ao capturar a sua voz. (" + event.error + ")";
        if (onError) onError(msg);
        else alert(msg);
      }
      setIsRecording(false);
      setIsProcessingAI(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return { isRecording, isProcessingAI, toggleRecording };
}
