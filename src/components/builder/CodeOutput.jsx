import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import useBlueprintStore from '@store/blueprintStore'
import GlassCard from '@components/ui/GlassCard'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import { copyToClipboard, exportCodeFile } from '@utils/exportUtils'

const CODE_TABS = [
  { key: 'fileTree',    label: 'File Tree',   lang: 'bash',       filename: 'structure.txt' },
  { key: 'appJSX',     label: 'App.jsx',      lang: 'jsx',        filename: 'App.jsx' },
  { key: 'heroJSX',    label: 'Hero.jsx',     lang: 'jsx',        filename: 'Hero.jsx' },
  { key: 'sceneJSX',   label: 'HeroScene',    lang: 'jsx',        filename: 'HeroScene.jsx' },
  { key: 'sampleSection', label: 'Section',   lang: 'jsx',        filename: 'Section.jsx' },
  { key: 'installCmd', label: 'Install',      lang: 'bash',       filename: 'install.sh' },
]

// Custom syntax highlighter theme overrides
const THEME = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: 'transparent',
    margin: 0,
    padding: 0,
    fontSize: '0.75rem',
    lineHeight: '1.7',
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: 'transparent',
    fontSize: '0.75rem',
  },
}

export default function CodeOutput() {
  const { blueprint } = useBlueprintStore()
  const [activeTab, setActiveTab] = useState('fileTree')
  const [copied, setCopied] = useState(false)

  if (!blueprint) return (
    <div className="h-full flex items-center justify-center">
      <p className="text-white/30 text-sm">Generate a blueprint to see the code</p>
    </div>
  )

  const code = blueprint.generatedCode ?? {}
  const currentTab = CODE_TABS.find(t => t.key === activeTab)
  const currentCode = code[activeTab] ?? ''

  const handleCopy = async () => {
    await copyToClipboard(currentCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExport = () => {
    exportCodeFile(currentCode, currentTab?.filename ?? 'code.txt')
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Tech stack badges */}
      <div className="flex flex-wrap gap-1.5 flex-shrink-0">
        {Object.values(blueprint.tech).flat().map(t => (
          <Badge key={t} color="purple">{t}</Badge>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto flex-shrink-0 pb-0.5">
        {CODE_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200
              ${activeTab === tab.key
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'}
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Code panel */}
      <GlassCard padding="p-0" className="flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/60" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <span className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <span className="text-2xs text-white/30 font-mono">{currentTab?.filename}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExport}>
              Download
            </Button>
          </div>
        </div>

        {/* Code */}
        <div className="overflow-auto p-4 h-[calc(100%-48px)]">
          <SyntaxHighlighter
            language={currentTab?.lang ?? 'jsx'}
            style={THEME}
            showLineNumbers
            lineNumberStyle={{ color: 'rgba(255,255,255,0.12)', fontSize: '0.65rem', minWidth: '2.5rem' }}
            wrapLines
          >
            {currentCode || '// No code generated for this file yet'}
          </SyntaxHighlighter>
        </div>
      </GlassCard>
    </div>
  )
}
