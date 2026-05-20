
import React, { useMemo, useRef, useState } from 'react';
import { AnalysisResult, InputMode } from './types';
import { GeminiService } from './services/geminiService';

const App: React.FC = () => {
  const [mode, setMode] = useState<InputMode>('text');
  const [inputValue, setInputValue] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState('image/jpeg');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gemini = useMemo(() => new GeminiService(), []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setImagePreview(reader.result as string);
        setImageMimeType(file.type || 'image/jpeg');
        setInputValue(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const runAnalysis = async () => {
    if (!inputValue.trim()) {
      setError('Please provide content to analyze.');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const analysis = await gemini.analyzeOffer(inputValue, mode, imageMimeType);
      setResult(analysis);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed. Please check your connection and try again.';
      setError(message);
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'Legit': return 'text-green-600 bg-green-50 border-green-200';
      case 'Suspicious': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Fake': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const copyReport = () => {
    if (!result) return;
    const report = `
Offer Type: ${result.offerType}
Source Verification: ${result.sourceVerification}
Company Verification: ${result.companyVerification}
Internship Details Review: ${result.internshipDetailsReview}
Red Flags Detected: ${result.redFlagsDetected.join(', ') || 'None'}
Credibility Score: ${result.credibilityScore}
Final Verdict: ${result.finalVerdict}
Safety Advice for the User: ${result.safetyAdvice.join(' ')}
    `.trim();
    navigator.clipboard.writeText(report);
    alert('Report copied to clipboard!');
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <i className="fas fa-shield-halved text-white text-xl"></i>
            </div>
            <h1 className="text-xl font-bold text-gray-800">ScamGuard <span className="text-blue-600">AI</span></h1>
          </div>
          <div className="hidden md:block text-sm text-gray-500 font-medium">
            Professional Job & Internship Verification
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
        {/* Intro Section */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Verify Job Offers in Seconds</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Our AI analyst uses real-time search and cross-referencing to protect you from fraudulent hiring schemes.
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-100">
            {(['text', 'image', 'url'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setMode(t);
                  setInputValue('');
                  setImagePreview(null);
                  setImageMimeType('image/jpeg');
                  setError(null);
                }}
                className={`flex-1 py-4 text-sm font-semibold transition-all ${
                  mode === t 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <i className={`fas ${t === 'text' ? 'fa-align-left' : t === 'image' ? 'fa-image' : 'fa-link'} mr-2`}></i>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="p-6">
            {mode === 'text' && (
              <textarea
                placeholder="Paste the internship offer text or email content here..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full h-48 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
              />
            )}

            {mode === 'image' && (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center hover:border-blue-400 cursor-pointer transition-all bg-gray-50/50 group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                />
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="Offer Preview" className="max-h-64 rounded-lg shadow-md" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); setImagePreview(null); setInputValue(''); setImageMimeType('image/jpeg'); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full text-xs shadow-lg hover:bg-red-600"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm group-hover:scale-110 transition-transform">
                      <i className="fas fa-cloud-upload-alt text-2xl text-blue-500"></i>
                    </div>
                    <div>
                      <p className="text-gray-700 font-medium">Upload an image of the offer letter</p>
                      <p className="text-sm text-gray-500 mt-1">PNG, JPG or Screenshot</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode === 'url' && (
              <input
                type="url"
                placeholder="https://company-careers.com/job-post-123"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            )}

            <button
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className={`w-full mt-6 py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center space-x-2 ${
                isAnalyzing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Investigating Legitimacy...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-search"></i>
                  <span>Start Analysis</span>
                </>
              )}
            </button>
            {error && <p className="text-red-500 text-sm mt-3 text-center"><i className="fas fa-exclamation-circle mr-1"></i> {error}</p>}
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Verdict Card */}
            <div className={`p-8 rounded-2xl border ${getVerdictColor(result.finalVerdict)} shadow-sm relative overflow-hidden`}>
               <div className="absolute top-0 right-0 p-4 opacity-10">
                  <i className={`fas ${result.finalVerdict === 'Legit' ? 'fa-check-circle' : result.finalVerdict === 'Fake' ? 'fa-skull-crossbones' : 'fa-exclamation-triangle'} text-8xl`}></i>
               </div>
               
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div className="space-y-2">
                    <span className="text-sm font-bold uppercase tracking-wider opacity-70">Final Verdict</span>
                    <h3 className="text-4xl font-black">{result.finalVerdict.toUpperCase()}</h3>
                    <p className="text-lg opacity-90 max-w-lg">
                      {result.finalVerdict === 'Legit' 
                        ? 'This offer appears to be from a genuine source. Proceed with normal precautions.' 
                        : result.finalVerdict === 'Fake' 
                        ? 'CRITICAL ALERT: This shows definitive signs of a scam. Do not share personal data.' 
                        : 'Caution advised. Some details do not match official company records.'}
                    </p>
                 </div>
                 
                 <div className="flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-2xl p-6 min-w-[160px] border border-white/40">
                    <span className="text-sm font-bold text-gray-600 mb-1">Score</span>
                    <div className="text-5xl font-black text-gray-800">{result.credibilityScore}</div>
                    <span className="text-xs text-gray-500 mt-1">out of 100</span>
                 </div>
               </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Analysis Steps */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <h4 className="font-bold text-gray-800 flex items-center">
                  <i className="fas fa-microscope text-blue-500 mr-2"></i> Analysis Details
                </h4>
                <div className="space-y-4 text-sm">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-bold text-gray-700 block mb-1">Offer Type</span>
                    <p className="text-gray-600">{result.offerType}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-bold text-gray-700 block mb-1">Source Verification</span>
                    <p className="text-gray-600">{result.sourceVerification}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-bold text-gray-700 block mb-1">Company Status</span>
                    <p className="text-gray-600">{result.companyVerification}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="font-bold text-gray-700 block mb-1">Role Review</span>
                    <p className="text-gray-600">{result.internshipDetailsReview}</p>
                  </div>
                </div>
              </div>

              {/* Red Flags & Safety */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <h4 className="font-bold text-gray-800 flex items-center mb-4">
                    <i className="fas fa-flag text-red-500 mr-2"></i> Red Flags Detected
                  </h4>
                  {result.redFlagsDetected.length > 0 ? (
                    <ul className="space-y-2">
                      {result.redFlagsDetected.map((flag, i) => (
                        <li key={i} className="flex items-start text-sm text-gray-700">
                          <i className="fas fa-exclamation-triangle text-red-400 mt-1 mr-2 text-xs"></i>
                          {flag}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-green-600 text-sm font-medium">No major red flags detected.</p>
                  )}
                </div>

                <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-lg">
                  <h4 className="font-bold flex items-center mb-4">
                    <i className="fas fa-user-shield mr-2"></i> Safety Advice
                  </h4>
                  <ul className="space-y-3">
                    {result.safetyAdvice.map((advice, i) => (
                      <li key={i} className="flex items-start text-sm">
                        <i className="fas fa-circle-check mt-1 mr-2 text-[10px] opacity-70"></i>
                        {advice}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Grounding Sources */}
            {result.groundingSources && result.groundingSources.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                 <h4 className="font-bold text-gray-800 flex items-center mb-4">
                    <i className="fas fa-link text-gray-400 mr-2"></i> Verification Sources
                 </h4>
                 <div className="flex flex-wrap gap-3">
                   {result.groundingSources.map((source, i) => (
                     <a 
                       key={i} 
                       href={source.uri} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 border border-blue-100 transition-colors flex items-center"
                     >
                       {source.title.length > 40 ? source.title.substring(0, 40) + '...' : source.title}
                       <i className="fas fa-external-link-alt ml-2 text-[10px]"></i>
                     </a>
                   ))}
                 </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex justify-center space-x-4 pt-4">
              <button 
                onClick={copyReport}
                className="px-6 py-3 rounded-xl bg-gray-800 text-white font-bold hover:bg-gray-900 transition-all flex items-center"
              >
                <i className="fas fa-copy mr-2"></i> Copy Full Report
              </button>
              <button 
                onClick={() => { setResult(null); setInputValue(''); setImagePreview(null); setImageMimeType('image/jpeg'); }}
                className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-all flex items-center"
              >
                <i className="fas fa-rotate-left mr-2"></i> New Analysis
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-24 py-12 bg-white border-t border-gray-100 text-center">
        <p className="text-gray-400 text-sm">Powered by Gemini 2.0 Flash • Built for Career Safety</p>
        <div className="flex justify-center space-x-6 mt-4">
          <i className="fab fa-linkedin text-gray-300 hover:text-blue-600 cursor-pointer text-xl transition-colors"></i>
          <i className="fab fa-github text-gray-300 hover:text-gray-900 cursor-pointer text-xl transition-colors"></i>
          <i className="fas fa-envelope text-gray-300 hover:text-red-500 cursor-pointer text-xl transition-colors"></i>
        </div>
      </footer>
    </div>
  );
};

export default App;
