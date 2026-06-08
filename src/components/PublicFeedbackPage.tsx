import { useState } from "react";

interface Props { tenantCode: string; tenantName?: string; }

export default function PublicFeedbackPage({ tenantCode, tenantName }: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [foodRating, setFoodRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAmharic, setIsAmharic] = useState(false);
  const tc = (en: string, am: string) => isAmharic ? am : en;

  const submit = async () => {
    if (rating === 0) return;
    setLoading(true);
    const r = await fetch(`/api/public/${tenantCode}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment, foodRating, serviceRating }),
    });
    if (r.ok) setSubmitted(true);
    setLoading(false);
  };

  const StarRow = ({ val, setVal, label }: { val: number; setVal: (v:number)=>void; label: string }) => (
    <div className="space-y-1">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="flex gap-1">
        {[1,2,3,4,5].map(i => (
          <button key={i} onClick={() => setVal(i)} className="text-2xl transition-transform hover:scale-110">
            <span className={i <= val ? "text-yellow-400" : "text-gray-600"}>★</span>
          </button>
        ))}
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="text-6xl">🙏</div>
        <h2 className="text-2xl font-bold text-amber-400">{tc("Thank You!","አመሰግናለሁ!")}</h2>
        <p className="text-gray-300">{tc("Your feedback helps us serve you better.","አስተያየትዎ ተቀብለናል። አገልግሎታችንን ለማሻሻል ይረዳናል።")}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-4xl">⭐</div>
          <h1 className="text-xl font-bold text-amber-400">{tenantName || tc("Restaurant","ሬስቶራንት")}</h1>
          <p className="text-gray-400 text-sm">{tc("How was your experience?","ልምድዎ እንዴት ነበር?")}</p>
          <button onClick={() => setIsAmharic(!isAmharic)} className="text-xs text-gray-500 underline">
            {isAmharic ? "Switch to English" : "ወደ አማርኛ"}
          </button>
        </div>

        {/* Overall Rating */}
        <div className="text-center space-y-2">
          <div className="text-sm font-medium text-gray-300">{tc("Overall Rating","አጠቃላይ ደረጃ")}</div>
          <div className="flex justify-center gap-2">
            {[1,2,3,4,5].map(i => (
              <button key={i}
                onClick={() => setRating(i)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(0)}
                className="text-4xl transition-transform hover:scale-125">
                <span className={i <= (hover || rating) ? "text-yellow-400" : "text-gray-600"}>★</span>
              </button>
            ))}
          </div>
          <div className="text-sm text-gray-400">
            {rating === 0 ? tc("Tap a star","ኮከብ ይምረጡ") :
             rating === 1 ? tc("Very Bad","በጣም መጥፎ") :
             rating === 2 ? tc("Bad","መጥፎ") :
             rating === 3 ? tc("OK","ደህና") :
             rating === 4 ? tc("Good","ጥሩ") : tc("Excellent!","አስደናቂ!")}
          </div>
        </div>

        {/* Sub-ratings */}
        <div className="space-y-4 border-t border-gray-700 pt-4">
          <StarRow val={foodRating} setVal={setFoodRating} label={tc("Food Quality","የምግብ ጥራት")} />
          <StarRow val={serviceRating} setVal={setServiceRating} label={tc("Service","አገልግሎት")} />
        </div>

        {/* Comment */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">{tc("Comment (optional)","አስተያየት (አማራጭ)")}</label>
          <textarea
            placeholder={tc("Tell us more...","ተጨማሪ ይናገሩ...")}
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            className="w-full bg-gray-800 text-gray-100 rounded-xl px-4 py-3 text-sm resize-none border border-gray-700 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <button onClick={submit} disabled={rating === 0 || loading}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-gray-900 font-bold py-4 rounded-2xl text-lg transition-colors">
          {loading ? tc("Submitting...","በማስገባት ላይ...") : tc("Submit Feedback","አስተያየት ላክ")}
        </button>
      </div>
    </div>
  );
}
