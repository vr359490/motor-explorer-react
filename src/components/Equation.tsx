import katex from 'katex'
import 'katex/dist/katex.min.css'

export function Equation({ expression }: { expression: string }) {
  return <div className="equation" dangerouslySetInnerHTML={{ __html: katex.renderToString(expression, { displayMode: true, throwOnError: false }) }} />
}
