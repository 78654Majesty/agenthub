export function DocsTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="bg-slate-50">
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 font-semibold text-slate-900"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-slate-200">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-4 py-3 ${
                    j === 0
                      ? "font-semibold text-indigo-500 font-mono"
                      : "text-slate-600"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
