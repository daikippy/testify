export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ヘッダー */}
      <header className="bg-white border-b p-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-700">Testify</h1>
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
            D
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 py-8">
        {/* 入力エリア */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border mb-8">
          <h2 className="text-lg font-bold mb-4">今日の証や霊的な学び</h2>
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="タイトル" 
              className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <textarea 
              placeholder="心に感じたこと、恵み、気づきを記録しましょう..." 
              rows={4}
              className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            ></textarea>
            <div className="flex justify-between items-center gap-2">
              <select className="text-sm bg-slate-50 p-2 rounded-lg text-slate-500 border-none outline-none">
                <option>自分のみ（非公開）</option>
                <option>証を分かち合う（公開）</option>
              </select>
              <button className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition">
                記録を保存
              </button>
            </div>
          </div>
        </section>

        {/* 過去の記録（サンプル） */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 px-2 uppercase tracking-wider">最近の記録</h3>
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-lg">祈りの答え</h4>
              <span className="text-xs text-slate-400 text-right">2026/04/22</span>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              今朝の祈りの中で、ずっと悩んでいたことに対して明確な平安を感じました。神様は私のことを心にかけてくださっていると確信しました。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}