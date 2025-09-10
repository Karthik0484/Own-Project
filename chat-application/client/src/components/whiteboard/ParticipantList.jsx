import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';

const ParticipantAvatar = ({ name = 'User', isSpeaking = false, micEnabled = true, compact = false, avatar }) => {
  const initial = name?.charAt(0)?.toUpperCase() || 'U';
  return (
    <div className={`relative ${compact ? 'w-10 h-10' : 'w-12 h-12'} rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold ${isSpeaking ? 'ring-2 ring-green-500 animate-pulse' : ''} overflow-hidden`}>
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        initial
      )}
      <span className={`absolute -bottom-1 -right-1 text-xs ${micEnabled ? 'text-green-500' : 'text-red-500'}`} aria-hidden>
        {micEnabled ? '✅' : '❌'}
      </span>
    </div>
  );
};

const ParticipantCard = ({ participant, index, compact = false }) => (
  <div
    key={`${participant.id || 'u'}-${index}`}
    className={`flex items-center gap-2 p-2 rounded-md bg-white/5 ${participant.isSpeaking ? 'ring-2 ring-green-500' : 'ring-1 ring-transparent'}`}
    aria-label={`${participant.name || 'Participant'}, mic ${participant.micEnabled ? 'enabled' : 'muted'}`}
  >
    <ParticipantAvatar name={participant.name} avatar={participant.avatar} isSpeaking={participant.isSpeaking} micEnabled={participant.micEnabled} compact={compact} />
    {!compact && (
      <div className="min-w-0 flex-1">
        <p className="text-xs text-white truncate">{participant.name || participant.id}</p>
      </div>
    )}
  </div>
);

const ParticipantList = ({ participants = [], layout = 'desktop' }) => {
  // layout: 'desktop' | 'tablet' | 'mobile'
  const count = participants.length;
  const [mobileTooltipId, setMobileTooltipId] = useState(null);

  if (layout === 'mobile') {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 bg-[#0e0f16] border-t border-[#2f303b] p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-gray-300">
            <Users className="w-4 h-4" />
            <span className="text-sm">Participants ({count})</span>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory" role="list" aria-label="Participants list">
          {participants.map((p, i) => (
            <div
              key={`${p.id || 'u'}-${i}`}
              className="relative flex-shrink-0 snap-start"
              role="listitem"
            >
              <button
                onClick={() => setMobileTooltipId(mobileTooltipId === (p.id || i) ? null : (p.id || i))}
                className={`flex flex-col items-center gap-1 min-w-[56px]`}
                aria-label={`${p.name || 'Participant'}, mic ${p.micEnabled ? 'enabled' : 'muted'}`}
                title={p.name || p.id}
              >
                <ParticipantAvatar name={p.name} avatar={p.avatar} isSpeaking={p.isSpeaking} micEnabled={p.micEnabled} compact />
                <span className="block max-w-[80px] text-[11px] leading-4 text-white/90 text-center truncate">{p.name || p.id}</span>
              </button>
              {mobileTooltipId === (p.id || i) && (
                <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-[#1a1b23] text-white text-xs px-2 py-1 rounded shadow border border-[#2f303b] whitespace-nowrap">
                  {p.name || p.id}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === 'tablet') {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[55] w-[calc(100%-2rem)] max-w-[900px]">
        <div className="backdrop-blur-md bg-[#0e0f16]/80 border border-[#2f303b] rounded-lg p-3">
          <div className="flex items-center justify-center gap-2 text-gray-300 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-xs">Participants ({count})</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {participants.map((p, i) => (
              <ParticipantCard key={`${p.id || 'u'}-${i}`} participant={p} index={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // desktop
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[55] w-[calc(100%-2rem)] max-w-[1200px]">
      <div className="backdrop-blur-md bg-[#0e0f16]/80 border border-[#2f303b] rounded-lg p-3">
        <div className="flex items-center justify-center gap-2 text-gray-300 mb-2">
          <Users className="w-4 h-4" />
          <span className="text-xs">Participants ({count})</span>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-2">
          {participants.map((p, i) => (
            <ParticipantCard key={`${p.id || 'u'}-${i}`} participant={p} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ParticipantList;
