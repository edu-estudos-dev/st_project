const normalizeSlugBase = (text) => {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
};

const forumSlugService = {
  gerarSlugBase(text) {
    const slug = normalizeSlugBase(text);

    if (!slug) {
      return `topico-${Date.now()}`;
    }

    return slug;
  },

  async gerarSlugUnico({ titulo, existsBySlug }) {
    const baseSlug = this.gerarSlugBase(titulo);
    let slug = baseSlug;
    let suffix = 2;

    while (await existsBySlug(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }
};

export default forumSlugService;