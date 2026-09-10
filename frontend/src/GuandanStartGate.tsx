import * as React from "react";
import { createPortal } from "react-dom";

import { GuandanStateContext } from "./GuandanStateProvider";
import { GuandanWebsocketContext } from "./GuandanWebsocketProvider";

const START_BUTTON_DELAY_MS = 3500;
const STARTED_BODY_CLASS = "guandan-hand-started";
const STARTED_STYLE_ID = "guandan-hide-initial-draw-after-start";

let activeStartGateOwner: symbol | null = null;

export const nextInitialDrawHidden = (
  hiddenForHand: boolean,
  isNewDeal: boolean,
  started: boolean,
  serverPlayStarted: boolean,
): boolean => {
  if (isNewDeal) return false;
  return hiddenForHand || started || serverPlayStarted;
};

const GuandanStartGate: React.FunctionComponent = () => {
  const { state } = React.useContext(GuandanStateContext);
  const { send } = React.useContext(GuandanWebsocketContext);
  const ownerToken = React.useRef(Symbol("guandan-start-gate-owner"));
  const [ownsGate, setOwnsGate] = React.useState(false);
  const [started, setStarted] = React.useState(false);
  const [hiddenForHand, setHiddenForHand] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [target, setTarget] = React.useState<Element | null>(null);
  const previousFreshDeal = React.useRef(false);

  const gameStarted =
    state.hand.length > 0 || state.handCounts.some((count) => count > 0);
  // A turn can be assigned as part of the initial draw before the user presses
  // Start. Only actual play history is authoritative evidence that play began.
  const serverPlayStarted =
    state.lastPlay.length > 0 || state.tablePlays.length > 0;
  const freshDeal =
    state.cardsPerPlayer !== null &&
    state.handCounts.length > 0 &&
    state.handCounts.every((count) => count === state.cardsPerPlayer);
  const shouldOfferStart =
    state.seat !== null &&
    gameStarted &&
    !hiddenForHand &&
    !serverPlayStarted &&
    freshDeal &&
    state.nextRoundPhase === null &&
    state.pendingTribute === null &&
    !state.trickComplete &&
    state.matchWinner === null &&
    state.lastPlay.length === 0 &&
    state.tablePlays.length === 0;

  React.useEffect(() => {
    if (activeStartGateOwner === null) {
      activeStartGateOwner = ownerToken.current;
      setOwnsGate(true);
    } else if (activeStartGateOwner === ownerToken.current) {
      setOwnsGate(true);
    }
    return () => {
      if (activeStartGateOwner === ownerToken.current) {
        activeStartGateOwner = null;
      }
    };
  }, []);

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
    document.body.classList.toggle(STARTED_BODY_CLASS, hiddenForHand || started);
  }, [hiddenForHand, started]);

  React.useEffect(() => {
    const isNewDeal = freshDeal && !previousFreshDeal.current;

    if (!gameStarted) {
      setStarted(false);
      setHiddenForHand(false);
      setReady(false);
    } else if (isNewDeal) {
      // A new hand has just been fully dealt. Re-arm the one-time Start gate.
      // This is the only point where the persistent per-hand hide latch resets.
      setStarted(false);
      setHiddenForHand(false);
      setReady(false);
    } else if (serverPlayStarted) {
      // Once any real play occurs, latch the initial-draw panel hidden for the
      // rest of this hand. Do not unhide it when tablePlays/lastPlay clear
      // between tricks.
      setHiddenForHand(true);
    }

    previousFreshDeal.current = freshDeal;
  }, [freshDeal, gameStarted, serverPlayStarted]);

  React.useEffect(() => {
    if (!shouldOfferStart || started) {
      setReady(false);
      return;
    }
    const timer = window.setTimeout(() => setReady(true), START_BUTTON_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [shouldOfferStart, started, state.handCounts, state.turn]);

  if (!ownsGate || target === null || !shouldOfferStart || started || !ready) return null;

  const start = (): void => {
    if (send({ type: "start_trick" } as any)) {
      setStarted(true);
      setHiddenForHand(true);
      setReady(false);
    }
  };

  return createPortal(
    <div
      className="guandan-start-trick-gate"
      data-start-gate-singleton="true"
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
