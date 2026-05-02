import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const BRAND = {
  blue: [37, 99, 235],
  violet: [124, 58, 237],
  green: [34, 197, 94],
  dark: [15, 23, 42],
  muted: [100, 116, 139],
  border: [226, 232, 240],
  softBlue: [239, 246, 255],
  softViolet: [245, 243, 255],
  softGreen: [240, 253, 244],
  light: [248, 250, 252],
  white: [255, 255, 255]
};

const formatCurrency = value => {
  const numberValue = Number(value || 0);

  return numberValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};

const formatDate = value => {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('pt-BR');
};

const formatDateTime = value => {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('pt-BR');
};

const formatText = value => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return '-';
  }

  return String(value);
};

const formatPayment = value => {
  if (value === 'pix') return 'PIX';
  if (value === 'especie') return 'Espécie';

  return formatText(value);
};

const formatNumber = value => {
  const numberValue = Number(value || 0);

  return numberValue.toLocaleString('pt-BR', {
    maximumFractionDigits: 2
  });
};

const normalizeText = value => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
};

const sanitizeFilename = value => {
  return String(value || 'recibo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
};

const drawRoundedCard = (doc, x, y, width, height, fillColor = BRAND.white) => {
  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.15);
  doc.setFillColor(...fillColor);
  doc.roundedRect(x, y, width, height, 4, 4, 'FD');
};

const drawLabelValue = (doc, label, value, x, y, maxWidth = 70) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.7);
  doc.setTextColor(...BRAND.muted);
  doc.text(label, x, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(...BRAND.dark);
  doc.text(formatText(value), x, y + 4.3, {
    maxWidth
  });
};

const drawSmallValue = (doc, label, value, x, y, maxWidth = 24) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.1);
  doc.setTextColor(...BRAND.muted);
  doc.text(label, x, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.dark);
  doc.text(formatText(value), x, y + 4, {
    maxWidth
  });
};

const addSectionTitle = (doc, title, y, accentColor) => {
  doc.setFillColor(...accentColor);
  doc.roundedRect(16, y - 4.3, 3, 6.8, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.2);
  doc.setTextColor(...BRAND.dark);
  doc.text(title, 22, y);

  return y + 6.2;
};

const drawSignatureBlock = (doc, marginX, currentY) => {
  const leftLineStart = marginX;
  const leftLineEnd = 90;
  const rightLineStart = 120;
  const rightLineEnd = 190;

  doc.setDrawColor(...BRAND.dark);
  doc.setLineWidth(0.2);
  doc.line(leftLineStart, currentY, leftLineEnd, currentY);
  doc.line(rightLineStart, currentY, rightLineEnd, currentY);

  currentY += 4.8;

  const leftCenter = (leftLineStart + leftLineEnd) / 2;
  const rightCenter = (rightLineStart + rightLineEnd) / 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...BRAND.muted);

  doc.text('Assinatura do comerciante/responsável', leftCenter, currentY, {
    align: 'center'
  });

  doc.text('Assinatura do operador', rightCenter, currentY, {
    align: 'center'
  });

  return currentY;
};

const drawEstabelecimentoCard = ({
  doc,
  sangria,
  marginX,
  currentY,
  contentWidth,
  fillColor,
  showMaquina = true
}) => {
  drawRoundedCard(doc, marginX, currentY, contentWidth, 46, fillColor);

  drawLabelValue(
    doc,
    'ESTABELECIMENTO',
    sangria.estabelecimento,
    marginX + 6,
    currentY + 8,
    72
  );

  const rightColX = marginX + 94;

  if (showMaquina) {
    drawLabelValue(
      doc,
      'MÁQUINA',
      sangria.maquina,
      rightColX,
      currentY + 8,
      28
    );
  }

  drawLabelValue(
    doc,
    'RESPONSÁVEL',
    sangria.responsavel_nome,
    marginX + 6,
    currentY + 21,
    72
  );

  drawLabelValue(
    doc,
    'TELEFONE',
    sangria.telefone_contato,
    rightColX,
    currentY + 21,
    38
  );

  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.12);
  doc.line(marginX + 6, currentY + 29, marginX + contentWidth - 6, currentY + 29);

  drawLabelValue(
    doc,
    'ENDEREÇO',
    sangria.endereco,
    marginX + 6,
    currentY + 37,
    92
  );

  drawLabelValue(
    doc,
    'BAIRRO',
    sangria.bairro,
    rightColX,
    currentY + 37,
    50
  );

  return currentY + 54;
};

const drawPeluciasReceipt = ({
  doc,
  sangria,
  accentColor,
  marginX,
  contentWidth,
  currentY
}) => {
  currentY = drawEstabelecimentoCard({
    doc,
    sangria,
    marginX,
    currentY,
    contentWidth,
    fillColor: BRAND.softViolet,
    showMaquina: true
  });

  drawRoundedCard(doc, marginX, currentY, contentWidth, 37, BRAND.softGreen);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...BRAND.green);
  doc.text('VALOR A RECEBER PELO COMERCIANTE', marginX + 6, currentY + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...BRAND.dark);
  doc.text(formatCurrency(sangria.valor_comerciante), marginX + 6, currentY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(...BRAND.muted);
  doc.text(
    'Valor correspondente ao comerciante nesta sangria.',
    marginX + 6,
    currentY + 24
  );

  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.15);

  const dividerX = marginX + 68;
  doc.line(dividerX, currentY + 7, dividerX, currentY + 30);

  const infoX = marginX + 76;
  const infoY = currentY + 9;
  const colGap = 28;
  const rowGap = 13;

  drawSmallValue(
    doc,
    'DATA DA SANGRIA',
    formatDate(sangria.data_sangria),
    infoX,
    infoY,
    22
  );

  drawSmallValue(
    doc,
    'PAGAMENTO',
    formatPayment(sangria.tipo_pagamento),
    infoX + colGap,
    infoY,
    20
  );

  drawSmallValue(
    doc,
    'QTDE. VENDIDA',
    formatNumber(sangria.qtde_vendido),
    infoX + colGap * 2,
    infoY,
    16
  );

  drawSmallValue(
    doc,
    'VALOR APURADO',
    formatCurrency(sangria.valor_apurado),
    infoX,
    infoY + rowGap,
    22
  );

  drawSmallValue(
    doc,
    'COMISSÃO',
    `${formatNumber(sangria.comissao)}%`,
    infoX + colGap,
    infoY + rowGap,
    20
  );

  drawSmallValue(
    doc,
    'PRODUTO',
    'Pelúcias',
    infoX + colGap * 2,
    infoY + rowGap,
    16
  );

  currentY += 47;

  currentY = addSectionTitle(doc, 'Observações', currentY, accentColor);

  drawRoundedCard(doc, marginX, currentY, contentWidth, 15, BRAND.light);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.muted);
  doc.text(formatText(sangria.observacoes), marginX + 5, currentY + 6.5, {
    maxWidth: contentWidth - 10
  });

  currentY += 24;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...BRAND.dark);
  doc.text(
    'Declaro que conferi as informações acima referentes a esta sangria.',
    marginX,
    currentY,
    {
      maxWidth: contentWidth
    }
  );

  currentY += 18;

  currentY = drawSignatureBlock(doc, marginX, currentY);

  return currentY;
};

const drawConsignadosReceipt = ({
  doc,
  sangria,
  accentColor,
  marginX,
  contentWidth,
  currentY
}) => {
  currentY = drawEstabelecimentoCard({
    doc,
    sangria,
    marginX,
    currentY,
    contentWidth,
    fillColor: BRAND.softBlue,
    showMaquina: false
  });

  drawRoundedCard(doc, marginX, currentY, contentWidth, 37, BRAND.softBlue);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...accentColor);
  doc.text('CONTROLE DE CONSIGNADOS NO PONTO', marginX + 6, currentY + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...BRAND.dark);
  doc.text(`${formatNumber(sangria.qtde_deixada)} un.`, marginX + 6, currentY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(...BRAND.muted);
  doc.text(
    'Quantidade atual que ficou no estabelecimento após esta visita.',
    marginX + 6,
    currentY + 24,
    {
      maxWidth: 56
    }
  );

  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.15);

  const dividerX = marginX + 68;
  doc.line(dividerX, currentY + 7, dividerX, currentY + 30);

  const infoX = marginX + 76;
  const infoY = currentY + 9;
  const colGap = 28;
  const rowGap = 13;

  drawSmallValue(
    doc,
    'DATA DA SANGRIA',
    formatDate(sangria.data_sangria),
    infoX,
    infoY,
    22
  );

  drawSmallValue(
    doc,
    'ESTOQUE ANTERIOR',
    formatNumber(sangria.estoque),
    infoX + colGap,
    infoY,
    22
  );

  drawSmallValue(
    doc,
    'QTDE. VENDIDA',
    formatNumber(sangria.qtde_vendido),
    infoX + colGap * 2,
    infoY,
    16
  );

  drawSmallValue(
    doc,
    'ABASTECIDO',
    formatNumber(sangria.abastecido),
    infoX,
    infoY + rowGap,
    22
  );

  drawSmallValue(
    doc,
    'ESTOQUE ATUAL',
    formatNumber(sangria.qtde_deixada),
    infoX + colGap,
    infoY + rowGap,
    22
  );

  drawSmallValue(
    doc,
    'CONFERÊNCIA',
    `${formatNumber(sangria.estoque)} - ${formatNumber(
      sangria.qtde_vendido
    )} + ${formatNumber(sangria.abastecido)} = ${formatNumber(
      sangria.qtde_deixada
    )}`,
    infoX + colGap * 2,
    infoY + rowGap,
    24
  );

  currentY += 47;

  currentY = addSectionTitle(doc, 'Resumo da movimentação', currentY, accentColor);

  drawRoundedCard(doc, marginX, currentY, contentWidth, 25, BRAND.light);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.dark);

  const resumoMovimentacao = `${formatNumber(sangria.estoque)} un. anteriores - ${formatNumber(
    sangria.qtde_vendido
  )} un. vendidas + ${formatNumber(sangria.abastecido)} un. abastecidas = ${formatNumber(
    sangria.qtde_deixada
  )} un. atuais`;

  doc.text(resumoMovimentacao, marginX + 5, currentY + 10, {
    maxWidth: contentWidth - 10
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...BRAND.muted);
  doc.text(
    'Este resumo representa a conferência da quantidade de consignados deixada no estabelecimento.',
    marginX + 5,
    currentY + 18,
    {
      maxWidth: contentWidth - 10
    }
  );

  currentY += 34;

  currentY = addSectionTitle(doc, 'Observações', currentY, accentColor);

  drawRoundedCard(doc, marginX, currentY, contentWidth, 15, BRAND.light);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.muted);
  doc.text(formatText(sangria.observacoes), marginX + 5, currentY + 6.5, {
    maxWidth: contentWidth - 10
  });

  currentY += 24;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...BRAND.dark);
  doc.text(
    'Declaro que conferi as quantidades acima referentes a esta visita.',
    marginX,
    currentY,
    {
      maxWidth: contentWidth
    }
  );

  currentY += 18;

  currentY = drawSignatureBlock(doc, marginX, currentY);

  return currentY;
};

export const gerarNomeArquivoRecibo = ({ produto, sangria }) => {
  const produtoSlug = sanitizeFilename(produto);
  const estabelecimentoSlug = sanitizeFilename(sangria?.estabelecimento);
  const id = sangria?.id || 'sem-id';

  return `recibo-${produtoSlug}-${estabelecimentoSlug}-${id}.pdf`;
};

export const gerarReciboPdfBuffer = ({ produto, sangria, usuario }) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const produtoNormalizado = normalizeText(produto);
  const isPelucias = produtoNormalizado.includes('PELUCIA');
  const isConsignados =
    produtoNormalizado.includes('CONSIGN') ||
    produtoNormalizado.includes('FIGURINHA');

  const accentColor = isPelucias ? BRAND.violet : BRAND.blue;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const contentWidth = pageWidth - marginX * 2;

  let currentY = 14;

  doc.setFillColor(...accentColor);
  doc.roundedRect(marginX, currentY, contentWidth, 24, 5, 5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BRAND.white);
  doc.text('VendMaster', marginX + 7, currentY + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('Recibo de sangria operacional', marginX + 7, currentY + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Recibo Nº ${sangria.id}`, pageWidth - marginX - 7, currentY + 8.5, {
    align: 'right'
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.text(
    formatDateTime(new Date()),
    pageWidth - marginX - 7,
    currentY + 14,
    {
      align: 'right'
    }
  );

  currentY += 34;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.dark);
  doc.text(`Recibo de Sangria - ${produto}`, marginX, currentY);

  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.muted);
  doc.text(
    'Documento para conferência das informações registradas na visita ao ponto.',
    marginX,
    currentY,
    {
      maxWidth: contentWidth
    }
  );

  currentY += 9;

  if (isPelucias) {
    currentY = drawPeluciasReceipt({
      doc,
      sangria,
      accentColor,
      marginX,
      contentWidth,
      currentY
    });
  }

  if (isConsignados) {
    currentY = drawConsignadosReceipt({
      doc,
      sangria,
      accentColor,
      marginX,
      contentWidth,
      currentY
    });
  }

  doc.setDrawColor(...BRAND.border);
  doc.line(marginX, pageHeight - 16, pageWidth - marginX, pageHeight - 16);

  doc.setFontSize(6.2);
  doc.setTextColor(...BRAND.muted);
  doc.text(
    'Gerado pelo VendMaster - Sistema de gestão de rotas e operação para máquinas recreativas.',
    pageWidth / 2,
    pageHeight - 10,
    {
      align: 'center'
    }
  );

  const arrayBuffer = doc.output('arraybuffer');

  return Buffer.from(arrayBuffer);
};