import { useEffect, useState } from "react";
import { useWorkoutStore } from "./workout-store";

// Скільки секунд лишилось відпочивати; null — відпочинку нема.
//
// Джерело правди — момент кінця (restEndsAt), а не лічильник: залишок щоразу
// обчислюється як restEndsAt - now. Інтервал нижче нічого не рахує, він лише
// оновлює now, щоб компонент перемалювався. Тож якщо телефон заблокували і
// браузер призупинив таймери, після розблокування число одразу правильне.
export function useRestSecondsLeft(): number | null {
  const restEndsAt = useWorkoutStore((state) => state.restEndsAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (restEndsAt === null) return;

    const tick = () => {
      const current = Date.now();
      setNow(current);
      // Відпочинок скінчився — тікати далі нема чого
      if (current >= restEndsAt) stop();
    };

    // Перший тік — одразу, а не через секунду: now у стані міг застаріти
    // (його востаннє оновлювали ще під час минулого відпочинку), і до
    // першого тіку залишок був би завищений. setTimeout(0), а не прямий
    // виклик: синхронний setState в ефекті дає зайвий каскадний рендер
    const first = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);

    // Повернення з фону: браузер міг пропустити тіки, оновлюємося одразу,
    // не чекаючи наступного
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    function stop() {
      clearTimeout(first);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    }

    // Без очищення кожен новий відпочинок (новий restEndsAt) додавав би ще
    // один інтервал поверх старих — і вони тікали б вічно, навіть після
    // виходу з екрана
    return stop;
  }, [restEndsAt]);

  if (restEndsAt === null) return null;

  // ceil, а не floor: 0.3 с — це ще «0:01», а «0:00» має зʼявитись рівно
  // тоді, коли відпочинок справді скінчився
  return Math.max(0, Math.ceil((restEndsAt - now) / 1000));
}
