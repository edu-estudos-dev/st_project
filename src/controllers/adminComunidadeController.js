import forumTopicModel from '../models/forumTopicModel.js';
import forumReplyModel from '../models/forumReplyModel.js';

function formatarDataForum(data) {
  if (!data) return '';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(data));
}

function getRedirectBack(req) {
  const referer = String(req.get('referer') || '').trim();

  if (!referer) {
    return '/admin/comunidade';
  }

  try {
    const parsed = new URL(referer, 'https://vendmaster.local');

    if (!parsed.pathname.startsWith('/comunidade') && !parsed.pathname.startsWith('/admin/comunidade')) {
      return '/admin/comunidade';
    }

    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return '/admin/comunidade';
  }
}

function appendQueryParam(url, key, value) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${key}=${encodeURIComponent(value)}`;
}

function parsePositiveId(value) {
  const normalized = String(value || '').trim();

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const id = Number(normalized);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

const AdminComunidadeController = {
  async index(req, res, next) {
    try {
      const topicos = await forumTopicModel.listarAdmin({ limit: 100 });

      return res.render('pages/admin/comunidade', {
        title: 'Admin Comunidade | VendMaster',
        metaDescription:
          'Painel administrativo da Comunidade VendMaster.',
        canonicalUrl: 'https://vendmaster.com.br/admin/comunidade',
        robotsMeta: 'noindex, nofollow',
        topicos,
        formatarDataForum,
        successMessage: req.query.success || null,
        errorMessage: req.query.error || null
      });
    } catch (error) {
      return next(error);
    }
  },

  async ocultarTopico(req, res, next) {
    try {
      const id = parsePositiveId(req.params.id);

      if (!id) {
        return res.redirect('/admin/comunidade?error=Topico invalido.');
      }

      const topico = await forumTopicModel.ocultar(id);

      if (!topico) {
        return res.redirect(
          '/admin/comunidade?error=Não foi possível ocultar o tópico.'
        );
      }

      return res.redirect(
        '/admin/comunidade?success=Tópico ocultado com sucesso.'
      );
    } catch (error) {
      return next(error);
    }
  },

  async reexibirTopico(req, res, next) {
    try {
      const id = parsePositiveId(req.params.id);

      if (!id) {
        return res.redirect('/admin/comunidade?error=Topico invalido.');
      }

      const topico = await forumTopicModel.reexibir(id);

      if (!topico) {
        return res.redirect(
          '/admin/comunidade?error=Não foi possível reexibir o tópico.'
        );
      }

      return res.redirect(
        '/admin/comunidade?success=Tópico reexibido com sucesso.'
      );
    } catch (error) {
      return next(error);
    }
  },

  async excluirTopico(req, res, next) {
    try {
      const id = parsePositiveId(req.params.id);

      if (!id) {
        return res.redirect('/admin/comunidade?error=Topico invalido.');
      }

      const topico = await forumTopicModel.excluir(id);

      if (!topico) {
        return res.redirect(
          '/admin/comunidade?error=Não foi possível excluir o tópico.'
        );
      }

      return res.redirect(
        '/admin/comunidade?success=Tópico excluído com sucesso.'
      );
    } catch (error) {
      return next(error);
    }
  },

  async alternarFixadoTopico(req, res, next) {
    try {
      const id = parsePositiveId(req.params.id);

      if (!id) {
        return res.redirect('/admin/comunidade?error=Topico invalido.');
      }

      const topico = await forumTopicModel.alternarFixado(id);

      if (!topico) {
        return res.redirect(
          '/admin/comunidade?error=Não foi possível atualizar a fixação do tópico.'
        );
      }

      return res.redirect(
        '/admin/comunidade?success=Status de fixação atualizado.'
      );
    } catch (error) {
      return next(error);
    }
  },

  async alternarFechadoTopico(req, res, next) {
    try {
      const id = parsePositiveId(req.params.id);

      if (!id) {
        return res.redirect('/admin/comunidade?error=Topico invalido.');
      }

      const topico = await forumTopicModel.alternarFechado(id);

      if (!topico) {
        return res.redirect(
          '/admin/comunidade?error=Não foi possível atualizar o status do tópico.'
        );
      }

      return res.redirect(
        '/admin/comunidade?success=Status do tópico atualizado.'
      );
    } catch (error) {
      return next(error);
    }
  },

  async ocultarResposta(req, res, next) {
    try {
      const redirectUrl = getRedirectBack(req);
      const id = parsePositiveId(req.params.id);

      if (!id) {
        return res.redirect(
          appendQueryParam(redirectUrl, 'error', 'Resposta invalida.')
        );
      }

      const resposta = await forumReplyModel.ocultar(id);

      if (!resposta) {
        return res.redirect(
          appendQueryParam(redirectUrl, 'error', 'Não foi possível ocultar a resposta.')
        );
      }

      return res.redirect(
        appendQueryParam(redirectUrl, 'success', 'Resposta ocultada com sucesso.')
      );
    } catch (error) {
      return next(error);
    }
  },

  async excluirResposta(req, res, next) {
    try {
      const redirectUrl = getRedirectBack(req);
      const id = parsePositiveId(req.params.id);

      if (!id) {
        return res.redirect(
          appendQueryParam(redirectUrl, 'error', 'Resposta invalida.')
        );
      }

      const resposta = await forumReplyModel.excluir(id);

      if (!resposta) {
        return res.redirect(
          appendQueryParam(redirectUrl, 'error', 'Não foi possível excluir a resposta.')
        );
      }

      return res.redirect(
        appendQueryParam(redirectUrl, 'success', 'Resposta excluída com sucesso.')
      );
    } catch (error) {
      return next(error);
    }
  }
};

export default AdminComunidadeController;
