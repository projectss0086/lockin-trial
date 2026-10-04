"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 회원가입 직후 순서대로 표시되는 안내 시퀀스 (인지-감정-관계)
const SCREENS = [
  {
    hero: true,
    badge: "🔒",
    lines: ["안녕하세요.", "자물쇠 피드백입니다."],
  },
  {
    lines: [
      "지금부터 우리는",
      "학부모 고객이",
      "제대로 된 학원을 선택했다는",
      "확신을 심어줄",
      "메세지를 만들어 볼거예요.",
    ],
  },
  {
    lines: [
      "먼저, 우리 아이가 학원에서",
      "학습이 잘 되고 있고",
      "잘 관리받고 있음을",
      { b: "인지" }, "하게 할거예요",
    ],
  },
  {
    lines: [
      "다음으로, 학부모가",
      "아이를 생각하는 마음과",
      "같은 마음으로",
      "아이들을 지도하고 있음을 보여주어",
      { b: "감정" }, "을 자극할거구요",
    ],
  },
  {
    lines: [
      "원장님께서 어머님과",
      "한 팀이라는 것을 강조하여",
      ["좋은 ", { b: "관계" }, "를 만들거예요."],
    ],
  },
  {
    lines: [
      { b: "인지-감정-관계" },
      "이 세 가지 축을 중심으로",
      "우리 학원을 선택한 것이",
      "얼마나 옳은 결정이었는지",
      "학부모 스스로",
      "판단하게 만들겁니다",
    ],
  },
  {
    lines: [
      ["학부모와의 '", { b: "신뢰 자본" }, "'이 쌓이면"],
      "원장님 학원에 들어온 학생들을",
      "나가지 못하게",
      "자물쇠로 잠글 수 있어요",
    ],
  },
  {
    lines: [
      "가장 중요한 것 한 가지,",
      "그 과정에서",
      "원장님의",
      { b: "감정노동을 최소화" }, "할거예요",
    ],
  },
  {
    hero: true,
    lines: ["원장님은", { b: "소중한 사람" }, "이니까요"],
  },
  {
    hero: true,
    last: true,
    lines: ["그럼,", "시작해볼까요?"],
  },
];

function renderLine(line, i) {
  // 문자열 / {b:"강조"} / 배열(혼합) 모두 지원
  const parts = Array.isArray(line) ? line : [line];
  return (
    <span key={i} className="wline">
      {parts.map((p, j) =>
        typeof p === "object" && p && p.b ? (
          <b key={j}>{p.b}</b>
        ) : (
          <span key={j}>{p}</span>
        )
      )}
    </span>
  );
}

export default function WelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const N = SCREENS.length;
  const cur = SCREENS[step];
  const isLast = step >= N - 1;

  const next = () => {
    if (!isLast) setStep((s) => s + 1);
  };
  const start = () => router.push("/dashboard");

  return (
    <div
      className="wwrap"
      onClick={next}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") next();
      }}
    >
      <div className="wdots">
        {SCREENS.map((_, i) => (
          <span key={i} className={"wdot" + (i === step ? " on" : "")} />
        ))}
      </div>

      <div key={step} className={"wscr" + (cur.hero ? " hero" : "")}>
        {cur.badge && <div className="wbadge">{cur.badge}</div>}
        <div className="wlines">{cur.lines.map(renderLine)}</div>

        {cur.last && (
          <button
            className="wcta"
            onClick={(e) => {
              e.stopPropagation();
              start();
            }}
          >
            첫 피드백 만들러 가기 →
          </button>
        )}
      </div>

      {!isLast && <div className="whint">화면을 터치하면 다음으로 넘어가요</div>}

      <style jsx global>{`
        html,
        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
        }
        .wwrap {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 34px;
          color: #2b2b31;
          background: #ffffff;
          cursor: pointer;
          user-select: none;
          overflow: hidden;
          font-family: inherit;
          -webkit-tap-highlight-color: transparent;
        }
        .wdots {
          position: absolute;
          top: 28px;
          left: 0;
          right: 0;
          display: flex;
          gap: 7px;
          justify-content: center;
        }
        .wdot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #d7e3e1;
          transition: all 0.3s ease;
        }
        .wdot.on {
          background: #0f766e;
          width: 20px;
          border-radius: 4px;
        }
        .wscr {
          max-width: 340px;
          animation: wfade 0.55s ease both;
        }
        .wbadge {
          font-size: 42px;
          margin-bottom: 18px;
        }
        .wlines {
          font-size: 23px;
          line-height: 1.72;
          font-weight: 500;
          letter-spacing: -0.3px;
          word-break: keep-all;
          color: #2b2b31;
        }
        .wscr.hero .wlines {
          font-size: 27px;
          font-weight: 800;
          color: #1f2a29;
        }
        .wline {
          display: block;
        }
        .wlines b {
          font-weight: 900;
          color: #0f766e;
          white-space: nowrap;
          background: linear-gradient(transparent 58%, rgba(45, 212, 191, 0.32) 58%);
          padding: 0 2px;
        }
        .wcta {
          margin-top: 40px;
          background: #0f766e;
          color: #fff;
          border: none;
          border-radius: 16px;
          padding: 17px 30px;
          font-size: 18px;
          font-weight: 800;
          box-shadow: 0 10px 24px rgba(15, 118, 110, 0.26);
          cursor: pointer;
          font-family: inherit;
        }
        .wcta:active {
          transform: scale(0.97);
        }
        .whint {
          position: absolute;
          bottom: 40px;
          left: 0;
          right: 0;
          font-size: 13px;
          color: #a7b0ae;
          font-weight: 500;
          animation: wpulse 2s ease-in-out infinite;
        }
        @keyframes wfade {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes wpulse {
          0%,
          100% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
}
