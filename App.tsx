
import React, { useState, useCallback, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  AssetRef, 
  GenerationConfig, 
  AppState, 
  BACKGROUND_OPTIONS, 
  PANTS_OPTIONS, 
  HAT_OPTIONS, 
  GLASSES_OPTIONS, 
  SHOE_OPTIONS, 
  VIDEO_TYPE_OPTIONS, 
  ASPECT_RATIO_OPTIONS 
} from './types';

// Augment the global Window object for AIStudio
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [images, setImages] = useState<AssetRef[]>([
    { id: 1, data: null, name: 'ด้านหน้า' },
    { id: 2, data: null, name: 'ด้านหลัง' },
    { id: 3, data: null, name: 'ด้านข้าง' },
    { id: 4, data: null, name: 'ซูมรายละเอียด' },
  ]);

  const [config, setConfig] = useState<GenerationConfig>({
    background: BACKGROUND_OPTIONS[0],
    pants: PANTS_OPTIONS[0],
    hat: HAT_OPTIONS[0],
    glasses: GLASSES_OPTIONS[0],
    shoes: SHOE_OPTIONS[0],
    videoType: VIDEO_TYPE_OPTIONS[0].value,
    aspectRatio: '16:9',
  });

  const [status, setStatus] = useState<AppState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [isKeySelected, setIsKeySelected] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsKeySelected(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleImageUpload = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => prev.map(img => img.id === id ? { ...img, data: reader.result as string } : img));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setIsKeySelected(true);
    }
  };

  const generateImage = async () => {
    if (!isKeySelected) {
      await handleSelectKey();
    }

    const availableRefs = images.filter(img => img.data);
    if (availableRefs.length === 0) {
      setError("กรุณาอัปโหลดภาพสินค้าอย่างน้อย 1 ภาพ");
      return;
    }

    setStatus('generating-image');
    setError(null);
    setGeneratedVideo(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const promptParts: any[] = availableRefs.map(img => {
        const [header, base64] = img.data!.split(',');
        const mimeType = header.split(':')[1].split(';')[0] || 'image/png';
        return {
          inlineData: {
            data: base64,
            mimeType: mimeType
          }
        };
      });

      const accessories = [
        config.pants !== 'None' ? `wearing ${config.pants}` : '',
        config.hat !== 'None' ? `wearing a ${config.hat}` : '',
        config.glasses !== 'None' ? `wearing ${config.glasses}` : '',
        config.shoes !== 'None' ? `wearing ${config.shoes}` : ''
      ].filter(Boolean).join(', ');

      promptParts.push({
        text: `Create a professional 4K high-resolution commercial product shot.
        Subject: A full-body minimalist white mannequin wearing the clothes from the provided reference images.
        Outfit details: ${accessories ? `The mannequin is also ${accessories}.` : 'The mannequin is only wearing the garment from the reference images.'}
        Environment: ${config.background}.
        Style: Realistic lighting, high detail fabric texture, commercial fashion photography, sharp focus, clean composition.
        Ensure the mannequin is visible from head to toe.`
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: promptParts },
        config: {
          imageConfig: {
            aspectRatio: config.aspectRatio,
            imageSize: '4K'
          }
        }
      });

      let foundImage = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          foundImage = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (foundImage) {
        setGeneratedImage(foundImage);
      } else {
        throw new Error("API ไม่ได้ส่งข้อมูลภาพกลับมา");
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        setIsKeySelected(false);
        setError("ข้อผิดพลาด API Key: กรุณาใช้ API Key จาก Paid Project ที่มีการตั้งค่า Billing เรียบร้อยแล้ว");
      } else {
        setError("ไม่สามารถสร้างภาพได้ กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setStatus('idle');
    }
  };

  const generateVideo = async () => {
    if (!generatedImage) return;

    setStatus('generating-video');
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let videoPrompt = "";
      switch (config.videoType) {
        case '360_rotation':
          videoPrompt = "The white mannequin wearing the clothes rotates slowly 360 degrees on a turntable. The camera remains fixed. Smooth studio lighting, sharp focus on the spinning subject.";
          break;
        case 'zoom_in_out':
          videoPrompt = "A smooth, cinematic camera zoom moving slowly towards the mannequin to reveal high-definition fabric textures, followed by a slow zoom out to show the full silhouette.";
          break;
        case 'orbit_shot':
          // ปรับปรุงให้เน้นย้ำเรื่องกล้องเคลื่อนที่รอบหุ่นที่หยุดนิ่ง
          videoPrompt = "A professional cinematic camera orbit shot. The camera physically moves in a full 360-degree circle around the white mannequin. Crucially, the mannequin is stationary and does not move or rotate. The motion comes entirely from the camera circling the subject. High-end lighting, seamless background.";
          break;
        case 'vertical_pan':
          videoPrompt = "A vertical camera pan starting from the mannequin's shoes, moving up slowly to reveal the pants, top, and head. Cinematic commercial style, smooth steady motion.";
          break;
        case 'dynamic_movement':
          videoPrompt = "Dynamic camera movement with multiple professional angles and lens flares, changing cinematic lighting to showcase the outfit in a modern lifestyle commercial look.";
          break;
      }

      const targetAspectRatio = config.aspectRatio === '16:9' ? '16:9' : '9:16';

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt: videoPrompt,
        image: {
          imageBytes: generatedImage.split(',')[1],
          mimeType: 'image/png'
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: targetAspectRatio
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) throw new Error("ไม่สามารถดาวน์โหลดไฟล์วิดีโอจากเซิร์ฟเวอร์ได้");
        
        const blob = await response.blob();
        const videoUrl = URL.createObjectURL(blob);
        setGeneratedVideo(videoUrl);
      } else {
        throw new Error("ระบบเรนเดอร์เสร็จแต่ไม่พบที่อยู่ไฟล์วิดีโอ");
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        setIsKeySelected(false);
        setError("API Key ของคุณอาจไม่รองรับ Veo: กรุณาใช้ Key จากโครงการที่มีการชำระเงิน (Paid Project)");
      } else {
        setError(`เกิดข้อผิดพลาดในการสร้างวิดีโอ: ${err.message || 'กรุณาลองใหม่อีกครั้ง'}`);
      }
    } finally {
      setStatus('idle');
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">V</div>
          <h1 className="text-xl font-bold text-slate-800">VisualPro AI</h1>
        </div>
        <div className="flex items-center gap-4">
          {!isKeySelected ? (
            <button 
              onClick={handleSelectKey}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              ตั้งค่า API Key เพื่อเริ่มใช้งาน
            </button>
          ) : (
            <span className="flex items-center gap-2 text-sm text-green-600 font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              ระบบพร้อมใช้งาน
            </span>
          )}
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-sm text-slate-500 hover:text-indigo-600 underline">Billing</a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Panel */}
        <aside className="lg:col-span-4 space-y-8">
          <section className="bg-white p-6 rounded-2xl shadow-sm border">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs">1</span>
              อัปโหลดภาพต้นแบบ
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {images.map((img) => (
                <div key={img.id} className="relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(img.id, e)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${img.data ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'}`}>
                    {img.data ? (
                      <img src={img.data} alt={img.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <>
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        <span className="text-[10px] uppercase font-bold text-slate-400">{img.name}</span>
                      </>
                    )}
                  </div>
                  {img.data && (
                    <button 
                      onClick={() => setImages(prev => prev.map(i => i.id === img.id ? { ...i, data: null } : i))}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border space-y-5">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs">2</span>
              สไตล์และอุปกรณ์เสริม
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">ฉากหลัง</label>
                <select value={config.background} onChange={(e) => setConfig(prev => ({ ...prev, background: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  {BACKGROUND_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">กางเกง</label>
                  <select value={config.pants} onChange={(e) => setConfig(prev => ({ ...prev, pants: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    {PANTS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">หมวก</label>
                  <select value={config.hat} onChange={(e) => setConfig(prev => ({ ...prev, hat: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    {HAT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={generateImage}
              disabled={status !== 'idle'}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3"
            >
              {status === 'generating-image' ? 'กำลังสร้างภาพ AI...' : 'สร้างภาพสินค้า AI 4K'}
            </button>
          </section>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
              {error}
            </div>
          )}
        </aside>

        {/* Right Panel */}
        <div className="lg:col-span-8 space-y-8">
          <section className="bg-white rounded-2xl shadow-sm border overflow-hidden min-h-[500px] flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-slate-700">ผลลัพธ์ภาพ AI</h2>
                {generatedImage && (
                  <a href={generatedImage} download="ai-product.png" className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold hover:bg-green-200">ดาวน์โหลดภาพ</a>
                )}
              </div>
              <div className="flex gap-2">
                {ASPECT_RATIO_OPTIONS.map(ratio => (
                  <button key={ratio} onClick={() => setConfig(prev => ({ ...prev, aspectRatio: ratio }))} className={`px-3 py-1 text-xs rounded-full border ${config.aspectRatio === ratio ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500'}`}>{ratio}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
              {status === 'generating-image' ? (
                <div className="text-center animate-pulse">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  </div>
                  <p className="text-slate-500">กำลังออกแบบภาพสินค้าให้คุณ...</p>
                </div>
              ) : generatedImage ? (
                <img src={generatedImage} alt="AI Result" className="max-h-[60vh] rounded-lg shadow-xl" />
              ) : (
                <p className="text-slate-400">ภาพจำลองจะแสดงที่นี่หลังจากคุณกดสร้าง</p>
              )}
            </div>
          </section>

          {generatedImage && (
            <section className="bg-white p-8 rounded-2xl shadow-sm border">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">สร้างวิดีโอโฆษณา (Cinema Motion)</h2>
                  <p className="text-slate-500 text-sm mt-1">เปลี่ยนภาพนิ่งให้เป็นวิดีโอระดับมืออาชีพด้วยโมเดล Veo</p>
                </div>
                <div className="flex gap-3">
                  <select value={config.videoType} onChange={(e) => setConfig(prev => ({ ...prev, videoType: e.target.value as any }))} className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm">
                    {VIDEO_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <button
                    onClick={generateVideo}
                    disabled={status !== 'idle'}
                    className="bg-slate-900 text-white font-bold px-6 py-2 rounded-lg hover:bg-black disabled:bg-slate-400"
                  >
                    {status === 'generating-video' ? 'กำลังเรนเดอร์...' : 'เริ่มสร้างวิดีโอ'}
                  </button>
                </div>
              </div>

              <div className="bg-slate-100 rounded-xl min-h-[400px] flex items-center justify-center overflow-hidden border">
                {status === 'generating-video' ? (
                  <div className="text-center px-6">
                    <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                    <h3 className="text-xl font-bold text-slate-800">กำลังประมวลผลวิดีโอ...</h3>
                    <p className="text-slate-500 mt-2">ขั้นตอนนี้อาจใช้เวลา 1-2 นาที เนื่องจากเป็นการเรนเดอร์คุณภาพสูง</p>
                    <div className="mt-4 w-full max-w-xs mx-auto bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full animate-[progress_10s_ease-in-out_infinite]" style={{width: '60%'}}></div>
                    </div>
                  </div>
                ) : generatedVideo ? (
                  <div className="w-full flex flex-col items-center p-4">
                    <video src={generatedVideo} controls autoPlay loop className="max-h-[60vh] rounded-lg shadow-lg" />
                    <a href={generatedVideo} download="ai-video.mp4" className="mt-6 bg-indigo-600 text-white px-8 py-3 rounded-full font-bold hover:bg-indigo-700 shadow-md">ดาวน์โหลดวิดีโอ</a>
                  </div>
                ) : (
                  <p className="text-slate-400">วิดีโอจะถูกเรนเดอร์ที่นี่</p>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
