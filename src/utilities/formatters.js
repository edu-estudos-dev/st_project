export function formatTelefone(telefone) {
   // Remove caracteres não numéricos
   telefone = telefone.replace(/\D/g, '');

   // Formata o telefone com base na quantidade de dígitos
   if (telefone.length === 11) {
       return telefone.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, '($1) $2 $3-$4');
   } else if (telefone.length === 10) {
       return telefone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
   }

   // Retorna o telefone original se não tiver 10 ou 11 dígitos
   return telefone;
}
