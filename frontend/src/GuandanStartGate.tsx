import * as React from "react";
import { createPortal } from "react-dom";

import { GuandanStateContext } from "./GuandanStateProvider";
import { GuandanWebsocketContext } from "./GuandanWebsocketProvider";

const START_BUTTON_DELAY_MS = 3500;

const GuandanStartGate: React.FunctionComponent = () => {
  const { state } = React.useContext(GuandanStateContext);
  const { send } = React.useContext(GuandanWebsocketContext);
  const [started, setStarted] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [target, setTarget] = React.useState<Element | null>(null);

  const gameStarted =
    state.hand.length > 0 || state.handCounts.some((count) => count > 0);
  const shouldOfferStart =
    state.seat !== null &&
    gameStarted &&
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
    if (
      state.lastPlay.length > 0 ||
      state.tablePlays.length > 0 ||
      state.trickComplete ||
      state.nextRoundPhase !== null
    ) {
      setStarted(false);
    }
  }, [
    state.lastPlay.length,
    state.tablePlays.length,
    state.trickComplete,
    state.nextRoundPhase,
  ]);

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
        aria-label="开始本轮出牌"
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
        按“开始”后，由当前应出牌的真人或机器人开始本轮
      </small>
    </div>,
    target,
  );
};

export default GuandanStartGate;
