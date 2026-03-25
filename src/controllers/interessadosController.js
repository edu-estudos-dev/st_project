import { salvarContato } from '../models/interessadosModel.js';

const interessadosController = {
    salvarContato: async (req, res) => {
        const { nome, telefone, produtos } = req.body;
        console.log('Recebido no backend:', { nome, telefone, produtos }); // Log dos dados recebidos

        // Verificar se os campos são válidos
        if (!nome || !telefone || !produtos || telefone.replace(/\D/g, '').length !== 11) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios e o telefone deve ter 11 dígitos.' });
        }

        try {
            await salvarContato({ nome, telefone, produtos });
            return res.status(201).json({ message: 'Informações recebidas com sucesso!\nPor favor aguarde nosso contato.' }); // Garante que o corpo da resposta seja JSON
        } catch (error) {
            console.error('Erro ao salvar contato:', error);
            return res.status(500).json({ message: 'Erro ao salvar as informações.' }); // Garante que o corpo da resposta seja JSON
        }
    }
};

export default interessadosController;

