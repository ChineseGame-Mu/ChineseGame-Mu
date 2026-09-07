import * as React from "react";
import { createPortal } from "react-dom";

import { GuandanStateContext } from "./GuandanStateProvider";
import { GuandanWebsocketContext } from "./GuandanWebsocketProvider";

const START_BUTTON_DELAY_MS = 3500;
const STARTED_BODY_CLASS = "guandan-hand-started";
const STARTED_STYLE_ID = "guandan-hide-initial-draw-after-start";

const GuandanStartGate: React.FunctionComponent = () => {
  const { state } = React.useContext(GuandanStateContext);
  const { send } = React.useContext(GuandanWebsocketContext);
  const [started, setStarted] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [target, setTarget] = React.useState<Element | null>(null);

  const gameStarted =
    state.hand.length > 0 || state.handCounts.some((count) => count > 0);
  const freshDeal =
    state.cardsPerPlayer !== null &&
    state.handCounts.length > 0 &&
    state.handCounts.every((count) => count === state.cardsPerPlayer);
  const shouldOfferStart =
    state.seat !== null &&
    gameStarted &&
    freshDeal &&
    state.nextRoundPhase === null &&
    state.pendingTribute === null &&
    !state.trickComplete &&
    state.matchWinner === null &&
    state.lastPlay.length === 0 &&
    state.tablePlays.length === 0;

  React.useEffect(() => {
    const findTarget = (): void => {
      setTarget(document.querySelector(".guandan-table-stage"));
    };
    findTarget();
    const timer = window.setInterval(findTarget, 500);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    let style = document.getElementById(STARTED_STYLE_ID) as HTMLStyleElement | null;
    if (style === null) {
      style = document.createElement("style");
      style.id = STARTED_STYLE_ID;
      style.textContent = `body.${STARTED_BODY_CLASS} .guandan-initial-draw-mini { display: none !important; }`;
      document.head.appendChild(style);
    }

    return () => {
      document.body.classList.remove(STARTED_BODY_CLASS);
    };
  }, []);

  React.useEffect(() => {
    document.body.classList.toggle(STARTED_BODY_CLASS, started);
  }, [started]);

  React.useEffect(() => {
    if (!gameStarted || state.nextRoundPhase !== null) {
      setStarted(false);
      setReady(false);
    }
  }, [gameStarted, state.nextRoundPhase]);

  React.useEffect(() => {
    if (!shouldOfferStart || started) {
      setReady(false);
      return;
    }
    const timer = window.setTimeout(() => setReady(true), START_BUTTON_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [shouldOfferStart, started, state.handCounts, state.turn]);

  if (target === null || !shouldOfferStart || started || !ready) return null;

  const start = (): void => {
    if (send({ type: "start_trick" } as any)) {
      setStarted(true);
      setReady(false);
    }
  };

  return createPortal(
    <div
      className="guandan-start-trick-gate"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        margin: "18px auto",
        position: "relative",
        zIndex: 20,
      }}
    >
      <button
        type="button"
        onClick={start}
        aria-label="开始本局出牌"
        style={{
          minWidth: 190,
          minHeight: 68,
          borderRadius: 18,
          border: "3px solid #e5b13e",
          boxShadow: "0 4px 12px rgba(0,0,0,0.28)",
          fontSize: 30,
          fontWeight: 800,
          cursor: "pointer",
          background: "linear-gradient(#3cb85a, #168b37)",
          color: "white",
        }}
      >
        ▶ 开始
      </button>
      <small style={{ fontSize: 15, fontWeight: 700 }}>
        一局只需按一次“开始”，之后连续出牌直到本局结束
      </small>
    </div>,
    target,
  );
};

export default GuandanStartGate;
