# QA exploratorio VendMaster

Este roteiro simula um usuario real tentando quebrar o fluxo. Ele complementa o script `npm run qa:flow`, que protege pontos criticos contra regressao de codigo.

## Como rodar a varredura automatica

```bash
npm run qa:flow
```

O script nao substitui teste no navegador. Ele confere se protecoes essenciais continuam no codigo: admin fechado, assinatura sem escrita bloqueada, formularios publicos limitados, visitas de rota validadas, sangrias vinculadas protegidas e receita consolidada recalculada.

## Roteiro manual de quebra de fluxo

1. Cadastro e login
   - Cadastrar com e-mail real e confirmar que nao entra antes de verificar o link.
   - Tentar login com e-mail nao verificado.
   - Reenviar verificacao e conferir se o texto nao revela dados sensiveis.
   - Tentar senha fraca, e-mail repetido e usuario repetido.

2. Trial e produtos
   - Criar trial marcando apenas um produto.
   - Confirmar que menus e cadastros mostram apenas o produto liberado.
   - Tentar abrir rota, cadastrar sangria ou lancamento de produto nao liberado alterando o HTML/DevTools.
   - Em assinatura paga, confirmar que a troca de produtos pelo usuario e bloqueada.

3. Assinatura e acesso
   - Simular assinatura vencida/cancelada e tentar criar, editar, excluir e marcar pagamento.
   - Confirmar que consultas ainda abrem quando fizer sentido, mas acoes de escrita param.
   - Testar rotas POST direto sem usar botao da tela.

4. Estabelecimentos e isolamento
   - Editar/excluir usando ID de outro assinante.
   - Pesquisar termo comum e confirmar que nao traz dados de outro assinante.
   - Ver detalhes por URL manual com ID inexistente, negativo ou de outro assinante.

5. Rotas e visitas guiadas
   - Iniciar rota com filtro vazio, filtro invalido e bairros misturados.
   - Clicar em "Cheguei neste ponto" duas vezes rapidamente.
   - Alterar `rota_ponto_id`, `visita_id` ou `estabelecimento_id` no formulario de sangria aberto pela rota.
   - Tentar registrar produto de um ponto em visita de outro ponto.

6. Sangrias e estoque
   - Salvar valores negativos, texto em campo numerico, data futura e data antiga.
   - Em consignados/pelucias, tentar deixar estoque negativo.
   - Excluir sangria criada por visita guiada e confirmar que o sistema bloqueia.
   - Editar sangria de mes fechado e conferir se o lancamento consolidado muda.

7. Financeiro
   - Enviar `Entrada` com tipo de `Saida` e vice-versa.
   - Enviar forma de pagamento inventada, parcela zero, parcela 121 e valor zero.
   - Criar lancamento de produto nao liberado.
   - Marcar como pago lancamento que nao e boleto ou nao pertence ao assinante.

8. Admin
   - Acessar `/admin/assinantes` e `/admin/interessados` com usuario comum.
   - Marcar interessado como contatado e voltar para pendente.
   - Testar interessado sem e-mail, sem WhatsApp e com campos longos.
   - Conferir que e-mails ficam guardados para campanhas futuras, mas a tela exige admin.

9. Publico, blog e mobile
   - Enviar muitos formularios de interesse em sequencia e confirmar bloqueio temporario.
   - Testar menu hamburguer em blog, artigos, categorias, termos e politica.
   - Abrir artigo longo em mobile e conferir se nao corta conteudo.
   - Conferir carrossel da home em desktop e mobile, especialmente cortes e areas brancas.

## Severidade

- Critico: exposicao de dados entre assinantes, admin aberto, login sem verificacao, escrita com assinatura bloqueada.
- Alto: perda de historico financeiro/rota, estoque negativo, exclusao de sangria vinculada, e-mail de lead exposto.
- Medio: fluxo travado, mensagem errada, cache escondendo versao nova, layout mobile cortado.
- Baixo: copy, alinhamento visual, estados vazios e microinteracoes.
