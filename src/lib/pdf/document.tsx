import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'
import { computeTotals, effectiveUnitPrice, lineNet } from '../calculations'
import { labelCategoria, labelOperacao, siglaOperacao } from '../constants'
import { formatBRL, formatDate, formatDateTime, formatHours } from '../format'
import { readableOn } from '../contrast'
import type { PdfData, PdfItem } from './types'

const FONTS: Record<string, { regular: string; bold: string }> = {
  helvetica: { regular: 'Helvetica', bold: 'Helvetica-Bold' },
  times: { regular: 'Times-Roman', bold: 'Times-Bold' },
  courier: { regular: 'Courier', bold: 'Courier-Bold' },
}

const GRAY = '#64748b'
const LINE = '#cbd5e1'

function makeStyles(d: PdfData) {
  const t = d.template
  const f = FONTS[t.fonte] ?? FONTS.helvetica
  const compact = t.layout === 'compacto'
  const modern = t.layout === 'moderno'
  const classic = t.layout === 'classico'
  const base = compact ? 7.5 : 8.5
  const on = readableOn(t.cor_primaria)
  return StyleSheet.create({
    page: {
      paddingTop: compact ? 22 : 28,
      paddingHorizontal: compact ? 24 : 30,
      paddingBottom: 46,
      fontFamily: f.regular,
      fontSize: base,
      color: t.cor_secundaria,
    },
    bold: { fontFamily: f.bold },
    muted: { color: GRAY },
    // cabeçalho
    band: {
      backgroundColor: t.cor_primaria,
      marginHorizontal: compact ? -24 : -30,
      marginTop: compact ? -22 : -28,
      paddingHorizontal: compact ? 24 : 30,
      paddingVertical: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    bandText: { color: on },
    head: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: compact ? 6 : 8,
      marginBottom: compact ? 6 : 10,
      borderBottomWidth: 2,
      borderBottomColor: t.cor_primaria,
    },
    logo: { width: compact ? 34 : 50, height: compact ? 34 : 50, objectFit: 'contain', marginRight: 10 },
    logoBox: { backgroundColor: '#ffffff', padding: 3, borderRadius: 4, marginRight: 10 },
    shopName: { fontFamily: f.bold, fontSize: compact ? 11 : 14 },
    title: {
      fontFamily: f.bold,
      fontSize: compact ? 11 : modern ? 18 : 15,
      color: t.cor_primaria,
      marginBottom: 6,
      textAlign: classic ? 'center' : 'left',
    },
    // blocos
    blocks: { flexDirection: 'row', marginBottom: compact ? 6 : 8 },
    block: {
      flex: 1,
      padding: compact ? 5 : 7,
      marginRight: 6,
      borderWidth: modern ? 0 : 0.75,
      borderColor: LINE,
      borderRadius: modern ? 5 : 2,
      backgroundColor: modern ? '#f1f5f9' : undefined,
      borderTopWidth: modern ? 3 : 0.75,
      borderTopColor: modern ? t.cor_primaria : LINE,
    },
    blockTitle: {
      fontFamily: f.bold,
      fontSize: compact ? 7 : 7.5,
      textTransform: 'uppercase',
      color: t.cor_primaria,
      marginBottom: 3,
    },
    line: { marginBottom: 1.5 },
    params: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      borderWidth: 0.75,
      borderColor: LINE,
      borderRadius: 2,
      padding: 5,
      marginBottom: 8,
    },
    param: { marginRight: 14, marginBottom: 2 },
    // tabela
    th: {
      flexDirection: 'row',
      backgroundColor: classic ? undefined : t.cor_primaria,
      borderTopWidth: classic ? 1.5 : 0,
      borderBottomWidth: classic ? 1.5 : 0,
      borderColor: t.cor_primaria,
      paddingVertical: compact ? 3 : 4,
      paddingHorizontal: 3,
    },
    thText: { color: classic ? t.cor_primaria : on, fontFamily: f.bold, fontSize: compact ? 7 : 7.5 },
    tr: {
      flexDirection: 'row',
      paddingVertical: compact ? 2 : 3,
      paddingHorizontal: 3,
      borderBottomWidth: 0.5,
      borderBottomColor: LINE,
    },
    trAlt: { backgroundColor: '#f8fafc' },
    // resumo
    sectionTitle: {
      fontFamily: f.bold,
      fontSize: compact ? 8 : 9,
      color: t.cor_primaria,
      marginTop: compact ? 6 : 10,
      marginBottom: 3,
    },
    sumRow: { flexDirection: 'row', paddingVertical: 2, borderBottomWidth: 0.5, borderBottomColor: LINE },
    totalBox: {
      marginTop: 8,
      backgroundColor: classic ? undefined : t.cor_primaria,
      borderWidth: classic ? 1.5 : 0,
      borderColor: t.cor_primaria,
      borderRadius: modern ? 8 : 2,
      padding: compact ? 6 : 9,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    totalText: { color: classic ? t.cor_primaria : on, fontFamily: f.bold, fontSize: compact ? 11 : 14 },
    // rodapé
    sign: { flexDirection: 'row', justifyContent: 'space-between', marginTop: compact ? 16 : 28 },
    signLine: { width: '46%', borderTopWidth: 0.75, borderTopColor: t.cor_secundaria, paddingTop: 3, textAlign: 'center' },
    footer: {
      position: 'absolute',
      bottom: 16,
      left: compact ? 24 : 30,
      right: compact ? 24 : 30,
      flexDirection: 'row',
      justifyContent: 'space-between',
      fontSize: 7,
      color: GRAY,
      borderTopWidth: 0.5,
      borderTopColor: LINE,
      paddingTop: 4,
    },
  })
}

type S = ReturnType<typeof makeStyles>

const COLS = { op: 30, qtd: 26, cod: 48, forn: 42, preco: 56, desc: 34, liq: 60 }

function Cell({ w, right, children, style }: { w?: number; right?: boolean; children: React.ReactNode; style?: Style }) {
  return (
    <View style={[w ? { width: w } : { flex: 1 }, { paddingHorizontal: 2 }]}>
      <Text style={[right ? { textAlign: 'right' } : {}, style ?? {}]}>{children}</Text>
    </View>
  )
}

function ItemsTable({ d, s }: { d: PdfData; s: S }) {
  const showCode = d.template.mostrar_codigo_peca
  return (
    <View>
      <View style={s.th} fixed>
        <Cell w={COLS.op} style={s.thText}>Op.</Cell>
        <Cell w={COLS.qtd} right style={s.thText}>Qtd</Cell>
        {showCode && <Cell w={COLS.cod} style={s.thText}>Código</Cell>}
        <Cell style={s.thText}>Descrição</Cell>
        <Cell w={COLS.forn} style={s.thText}>Forn.</Cell>
        <Cell w={COLS.preco} right style={s.thText}>Preço</Cell>
        <Cell w={COLS.desc} right style={s.thText}>Desc.</Cell>
        <Cell w={COLS.liq} right style={s.thText}>Líquido</Cell>
      </View>
      {d.items.map((it: PdfItem, i) => (
        <View key={i} style={[s.tr, i % 2 ? s.trAlt : {}]} wrap={false}>
          <Cell w={COLS.op}>{siglaOperacao(it.operacao)}</Cell>
          <Cell w={COLS.qtd} right>{String(it.quantidade).replace('.', ',')}</Cell>
          {showCode && <Cell w={COLS.cod}>{it.codigo ?? ''}</Cell>}
          <Cell>
            {it.descricao}
            {it.tipo === 'servico' && it.horas ? `  (${formatHours(it.horas)})` : ''}
          </Cell>
          <Cell w={COLS.forn}>{it.tipo === 'peca' ? (it.fornecimento === 'cliente' ? 'Cliente' : 'Oficina') : '—'}</Cell>
          <Cell w={COLS.preco} right>{formatBRL(effectiveUnitPrice(it, d.params))}</Cell>
          <Cell w={COLS.desc} right>{it.desconto_pct ? `${String(it.desconto_pct).replace('.', ',')}%` : '—'}</Cell>
          <Cell w={COLS.liq} right style={s.bold}>{formatBRL(lineNet(it, d.params))}</Cell>
        </View>
      ))}
    </View>
  )
}

function Summary({ d, s }: { d: PdfData; s: S }) {
  const t = computeTotals(d.items, d.params)
  const row = (label: string, a: string, b: string, c: string, bold = false, key?: string) => (
    <View key={key} style={s.sumRow} wrap={false}>
      <Text style={[{ flex: 1 }, bold ? s.bold : {}]}>{label}</Text>
      <Text style={[{ width: 70, textAlign: 'right' }, bold ? s.bold : {}]}>{a}</Text>
      <Text style={[{ width: 70, textAlign: 'right' }, bold ? s.bold : {}]}>{b}</Text>
      <Text style={[{ width: 70, textAlign: 'right' }, bold ? s.bold : {}]}>{c}</Text>
    </View>
  )
  const hasPecas = t.pecasOficina.bruto + t.pecasCliente.bruto > 0
  return (
    <View wrap={false}>
      {hasPecas && (
        <View>
          <Text style={s.sectionTitle}>Peças</Text>
          {row('', 'Bruto', 'Descontos', 'Líquido', true)}
          {t.pecasOficina.bruto > 0 &&
            row('Fornecidas pela oficina', formatBRL(t.pecasOficina.bruto), formatBRL(t.pecasOficina.descontos), formatBRL(t.pecasOficina.liquido))}
          {t.pecasCliente.bruto > 0 &&
            row('Fornecidas pelo cliente (não somam no total)', formatBRL(t.pecasCliente.bruto), formatBRL(t.pecasCliente.descontos), formatBRL(t.pecasCliente.liquido))}
        </View>
      )}
      {t.maoDeObra.length > 0 && (
        <View>
          <Text style={s.sectionTitle}>Mão de obra e serviços</Text>
          {row('', 'Bruto', 'Descontos', 'Líquido', true)}
          {t.maoDeObra.map((c) =>
            row(`${labelCategoria(c.categoria)} (${String(c.pct).replace('.', ',')}%)`, formatBRL(c.bruto), formatBRL(c.descontos), formatBRL(c.liquido), false, c.categoria),
          )}
          {row('Total de mão de obra', formatBRL(t.maoDeObraTotal.bruto), formatBRL(t.maoDeObraTotal.descontos), formatBRL(t.maoDeObraTotal.liquido), true)}
        </View>
      )}
      <View style={{ marginTop: 6, alignItems: 'flex-end' }}>
        <Text>Subtotal: {formatBRL(t.subtotal)}</Text>
        {t.descontoGeral > 0 && (
          <Text>
            Desconto geral ({String(d.params.desconto_geral_pct).replace('.', ',')}%): − {formatBRL(t.descontoGeral)}
          </Text>
        )}
      </View>
      <View style={s.totalBox}>
        <Text style={s.totalText}>TOTAL GERAL</Text>
        <Text style={s.totalText}>{formatBRL(t.total)}</Text>
      </View>
    </View>
  )
}

function Header({ d, s }: { d: PdfData; s: S }) {
  const modern = d.template.layout === 'moderno'
  const shop = (
    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
      {d.workshop.logo_url &&
        (modern ? (
          <View style={s.logoBox}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- <Image> do react-pdf não tem alt */}
            <Image src={d.workshop.logo_url} style={{ width: 44, height: 44, objectFit: 'contain' }} />
          </View>
        ) : (
          // eslint-disable-next-line jsx-a11y/alt-text -- <Image> do react-pdf não tem alt
          <Image src={d.workshop.logo_url} style={s.logo} />
        ))}
      <Text style={[s.shopName, modern ? s.bandText : {}]}>{d.workshop.nome}</Text>
    </View>
  )
  const meta = (
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={[s.bold, { fontSize: 11 }, modern ? s.bandText : {}]}>Orçamento nº {d.numero}</Text>
      <Text style={modern ? s.bandText : s.muted}>Emitido em {formatDate(d.criadoEm)}</Text>
      {d.validadeAte && <Text style={modern ? s.bandText : s.muted}>Válido até {formatDate(d.validadeAte)}</Text>}
    </View>
  )
  const v = d.vehicle
  const vehicleTitle = [v.marca, v.modelo, v.versao, v.ano].filter(Boolean).join(' ')
  return (
    <View>
      <View style={modern ? s.band : s.head}>
        {shop}
        {meta}
      </View>
      <Text style={s.title}>{vehicleTitle || 'Veículo'}</Text>
    </View>
  )
}

function L({ s, k, val }: { s: S; k: string; val?: string | number | null }) {
  return val ? (
    <Text style={s.line}>
      <Text style={s.muted}>{k}: </Text>
      {val}
    </Text>
  ) : null
}

function Blocks({ d, s }: { d: PdfData; s: S }) {
  const v = d.vehicle
  if (d.template.layout === 'compacto') {
    const veic = [v.placa, v.cor, d.km != null ? `${d.km.toLocaleString('pt-BR')} km` : '', d.combustivel, d.template.mostrar_fipe && d.valorFipe ? `FIPE ${formatBRL(d.valorFipe)}` : '']
    const cli = [d.customer.nome, d.customer.cpf_cnpj, d.customer.telefone, d.customer.email]
    const ofi = [d.workshop.cnpj, d.workshop.telefone, d.workshop.endereco]
    const row = (k: string, parts: (string | null | undefined)[]) => (
      <Text style={s.line}>
        <Text style={[s.bold, { color: d.template.cor_primaria }]}>{k}  </Text>
        {parts.filter(Boolean).join('  ·  ')}
      </Text>
    )
    return (
      <View style={[s.params, { flexDirection: 'column', padding: 4 }]}>
        {row('VEÍCULO', veic)}
        {d.template.mostrar_chassi && v.chassi ? row('CHASSI', [v.chassi]) : null}
        {row('CLIENTE', cli)}
        {row('OFICINA', ofi)}
        {row('HORAS', [
          `MO ${formatBRL(d.params.valor_hora_mao_de_obra)}`,
          `Reparação ${formatBRL(d.params.valor_hora_reparacao)}`,
          `Pintura ${formatBRL(d.params.valor_hora_pintura)}`,
        ])}
      </View>
    )
  }
  return (
    <View>
      <View style={s.blocks}>
        <View style={s.block}>
          <Text style={s.blockTitle}>Veículo</Text>
          <L s={s} k="Placa" val={v.placa} />
          <L s={s} k="Cor" val={v.cor} />
          {d.template.mostrar_chassi && <L s={s} k="Chassi" val={v.chassi} />}
          <L s={s} k="Km" val={d.km != null ? d.km.toLocaleString('pt-BR') : null} />
          <L s={s} k="Combustível" val={d.combustivel} />
          {d.template.mostrar_fipe && d.valorFipe ? <L s={s} k="Valor FIPE" val={formatBRL(d.valorFipe)} /> : null}
        </View>
        <View style={s.block}>
          <Text style={s.blockTitle}>Oficina</Text>
          <L s={s} k="Nome" val={d.workshop.nome} />
          <L s={s} k="CNPJ" val={d.workshop.cnpj} />
          <L s={s} k="Endereço" val={d.workshop.endereco} />
          <L s={s} k="Telefone" val={d.workshop.telefone} />
          <L s={s} k="E-mail" val={d.workshop.email} />
          <L s={s} k="Resp. técnico" val={d.workshop.responsavel_tecnico} />
        </View>
        <View style={[s.block, { marginRight: 0 }]}>
          <Text style={s.blockTitle}>Cliente</Text>
          <L s={s} k="Nome" val={d.customer.nome} />
          <L s={s} k="CPF/CNPJ" val={d.customer.cpf_cnpj} />
          <L s={s} k="Telefone" val={d.customer.telefone} />
          <L s={s} k="E-mail" val={d.customer.email} />
        </View>
      </View>
      <View style={s.params}>
        <Text style={s.param}>
          <Text style={s.muted}>Hora mão de obra: </Text>
          {formatBRL(d.params.valor_hora_mao_de_obra)}
        </Text>
        <Text style={s.param}>
          <Text style={s.muted}>Hora reparação: </Text>
          {formatBRL(d.params.valor_hora_reparacao)}
        </Text>
        <Text style={s.param}>
          <Text style={s.muted}>Hora pintura: </Text>
          {formatBRL(d.params.valor_hora_pintura)}
        </Text>
        {d.params.desconto_geral_pct > 0 && (
          <Text style={s.param}>
            <Text style={s.muted}>Desconto geral: </Text>
            {String(d.params.desconto_geral_pct).replace('.', ',')}%
          </Text>
        )}
      </View>
    </View>
  )
}

function Notes({ d, s }: { d: PdfData; s: S }) {
  const ops = [...new Set(d.items.map((i) => i.operacao))]
  const conditions = [
    d.validadeAte ? `Validade da proposta: até ${formatDate(d.validadeAte)}.` : '',
    d.garantiaDias ? `Garantia dos serviços: ${d.garantiaDias} dias.` : '',
    d.formasPagamento ? `Formas de pagamento: ${d.formasPagamento}.` : '',
    d.condicoes,
  ].filter(Boolean)
  return (
    <View wrap={false}>
      {d.observacoes ? (
        <View>
          <Text style={s.sectionTitle}>Observações</Text>
          <Text>{d.observacoes}</Text>
        </View>
      ) : null}
      {conditions.length > 0 && (
        <View>
          <Text style={s.sectionTitle}>Condições</Text>
          {conditions.map((c, i) => (
            <Text key={i} style={s.line}>{c}</Text>
          ))}
        </View>
      )}
      {ops.length > 0 && (
        <Text style={[s.muted, { fontSize: 7, marginTop: 6 }]}>
          Legenda: {ops.map((o) => `${siglaOperacao(o)} = ${labelOperacao(o)}`).join(' · ')}
        </Text>
      )}
      {d.template.mostrar_assinatura && (
        <View style={s.sign}>
          <Text style={s.signLine}>{d.workshop.nome}</Text>
          <Text style={s.signLine}>De acordo — {d.customer.nome || 'Cliente'}</Text>
        </View>
      )}
    </View>
  )
}

export function QuoteDocument({ data: d }: { data: PdfData }) {
  const s = makeStyles(d)
  const generated = formatDateTime()
  return (
    <Document title={`Orçamento ${d.numero} - ${d.vehicle.placa}`} author={d.workshop.nome} creator="Orçamento Rápido">
      <Page size="A4" style={s.page}>
        <Header d={d} s={s} />
        <Blocks d={d} s={s} />
        <ItemsTable d={d} s={s} />
        <Summary d={d} s={s} />
        <Notes d={d} s={s} />
        <View style={s.footer} fixed>
          <Text>
            Orçamento nº {d.numero} · gerado em {generated}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
