import { RotateCw } from "lucide-react";

// Пропозиція контракту: по плитці на кожен запланований підхід. null —
// підхід ще не зроблено; isHit — чи закрита цільова кількість повторень.
// status (нове): стан збереження на сервері. Без нього — збережено.
// onRetry (нове): тап по плитці, що не збереглась; приходить її індекс.
export type SetTile = {
  label: string;
  isHit: boolean;
  status?: "saving" | "failed";
} | null;

interface SetTilesProps {
  tiles: SetTile[];
  onRetry?: (index: number) => void;
}

const tileBase =
  "grid h-[52px] min-w-0 grow basis-[calc(25%-6px)] place-items-center rounded-control text-label font-semibold tabular-nums";

export function SetTiles({ tiles, onRetry }: SetTilesProps) {
  return (
    // Плитки тягнуться на всю ширину, але не більше 4 в рядку: basis — рівно
    // чверть рядка мінус частка проміжків (3 проміжки по 8px на 4 плитки =
    // 6px на плитку), тож п'ята не влазить і переноситься. grow розтягує
    // неповний рядок: 3 плитки — по третині, 5 — рядок з 4 і одна на всю
    <div className="mt-4 flex flex-wrap gap-2">
      {tiles.map((tile, index) => {
        if (tile === null) {
          return (
            <span
              key={`${index}-pending`}
              className={`${tileBase} text-dim-2 inset-ring-1 inset-ring-line`}
            >
              ·
            </span>
          );
        }

        if (tile.status === "failed") {
          // Не збереглось: плитка стає кнопкою повтору. Пунктирна рамка
          // відрізняє «сервер не прийняв» від «завалений підхід» (суцільна).
          return (
            <button
              key={`${index}-done`}
              onClick={() => onRetry?.(index)}
              aria-label={`Підхід ${tile.label} не збережено. Повторити`}
              className={`${tileBase} gap-0.5 border border-dashed border-danger/60 text-danger-soft transition-transform duration-150 ease-out active:scale-[.95]`}
            >
              <span className="flex items-center gap-1">
                <RotateCw size={12} strokeWidth={2.4} />
                {tile.label}
              </span>
            </button>
          );
        }

        // Ключ змінюється, коли плитка з порожньої стає заповненою: React
        // монтує новий елемент, і анімація появи програється саме для неї.
        return (
          <span
            key={`${index}-done`}
            className={`${tileBase} animate-tile-in motion-reduce:animate-fade-in ${
              tile.isHit
                ? "bg-surface-2 text-text"
                : "text-warn inset-ring-1 inset-ring-warn/45"
            } ${tile.status === "saving" ? "opacity-60" : ""} transition-opacity duration-200`}
          >
            {tile.label}
          </span>
        );
      })}
    </div>
  );
}
