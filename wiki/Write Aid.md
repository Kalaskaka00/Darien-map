# Write Aid

Use these Markdown shortcuts while editing an article.

## Text formatting

Wrap text in one asterisk on each side for *cursive (italic)* text:

```markdown
*Cursive text*
```

Use two asterisks for **bold**, or three for ***cursive bold***:

```markdown
**Bold text**
***Cursive bold text***
```

## Links

Link to another wiki article with its exact article name in double brackets:

```markdown
[[Article name]]
```

To show different link text, add a vertical bar between the article name and
the text to display:

```markdown
[[Article name|text to display]]
```

## Headings

Start a line with one or more `#` characters. A single `#` is the article
title; add more `#` characters for nested headings.

```markdown
# Article title
## Section
### Subsection
```

## GM-only information

The wiki's GM-only note format is:

```markdown
<!--GM
This text is visible to the GM only.
-->
```

The shared editor keeps GM-only text out of shared revisions for privacy. Add
or change GM-only sections directly in the local Markdown file; the upload
review preserves those local sections while applying an approved public
revision.

## World years

Use `{{year:3863}}` to display a year using the world's calendar formatting:

```markdown
{{year:3863}}
```