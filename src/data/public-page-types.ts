export interface PublicPageSection {
  title: string;
  body: string;
  items?: string[];
}

export interface PublicPageContent<TId extends string = string> {
  id: TId;
  label: string;
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  intro: string;
  sections: PublicPageSection[];
}
