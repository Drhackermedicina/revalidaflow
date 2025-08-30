// Função utilitária para formatar aproveitamento (TypeScript)
export function formatarAproveitamento(nota: number | undefined | null): string {
  if (nota === undefined || nota === null) return '0';
  return (Math.round(nota * 100) / 100).toFixed(2);
}
