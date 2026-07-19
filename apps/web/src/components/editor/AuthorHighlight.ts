/**
 * AuthorHighlight — Tiptap Mark Extension
 *
 * Tracks who wrote which piece of text in a collaborative document.
 * Each time the LOCAL user inserts characters, a ProseMirror `appendTransaction`
 * plugin attaches this mark to the newly inserted range, storing:
 *   - authorId    → the user's unique ID
 *   - authorName  → their display name (shown on hover as a tooltip)
 *   - authorColor → their session color (e.g. "hsl(210, 85%, 60%)")
 *
 * The mark is synced to all clients via Yjs, so every peer sees exactly
 * who wrote what. Remote Yjs transactions are skipped (they carry the
 * 'y-sync$' meta) so we never double-apply marks on received updates.
 *
 * Rendering: the mark renders as a <span class="author-highlight"> with
 * a CSS custom property --author-color.  A CSS underline + tooltip-on-hover
 * give the Google-Docs-style "who wrote this" experience.
 */

import { Mark, mergeAttributes } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'

// ── Types ──────────────────────────────────────────────────────────────────

export interface AuthorHighlightOptions {
  /** Unique identifier for the local user (e.g. from JWT sub claim) */
  userId: string
  /** Display name shown in the hover tooltip above highlighted text */
  userName: string
  /** HSL/hex color string used for the underline and tooltip background */
  userColor: string
  /** Extra HTML attributes forwarded to the rendered <span> */
  HTMLAttributes: Record<string, unknown>
}

// ── Extension ──────────────────────────────────────────────────────────────

export const AuthorHighlight = Mark.create<AuthorHighlightOptions>({
  name: 'authorHighlight',

  // Marks with higher priority are applied/removed first. Keeping this at the
  // default (1000) so it co-exists cleanly with bold, italic, link, etc.
  priority: 1000,

  // ── Default options ──────────────────────────────────────────────────────
  addOptions() {
    return {
      userId: '',
      userName: 'Anonymous',
      userColor: '#888888',
      HTMLAttributes: {},
    }
  },

  // ── Stored attributes ────────────────────────────────────────────────────
  //
  // ProseMirror marks can carry arbitrary attributes. We store all three
  // pieces of author metadata so they persist in the Yjs document and
  // can be read by any client — even those that joined after the text
  // was originally typed.
  addAttributes() {
    return {
      authorId: {
        default: null,
        // Read from the DOM when the document HTML is parsed (e.g. on reload)
        parseHTML: (el) => el.getAttribute('data-author-id'),
        // Write to the DOM when the mark is rendered
        renderHTML: (attrs) => ({ 'data-author-id': attrs.authorId }),
      },

      authorName: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-author-name'),
        renderHTML: (attrs) => ({ 'data-author-name': attrs.authorName }),
      },

      authorColor: {
        default: null,
        // We store the color as a CSS custom property so the CSS file can
        // reference it without any JS involvement.
        parseHTML: (el) => el.style.getPropertyValue('--author-color') || null,
        renderHTML: (attrs) => ({
          style: attrs.authorColor ? `--author-color: ${attrs.authorColor}` : '',
        }),
      },
    }
  },

  // ── HTML parsing ─────────────────────────────────────────────────────────
  parseHTML() {
    // Match any <span> that carries a data-author-id attribute
    return [{ tag: 'span[data-author-id]' }]
  },

  // ── HTML rendering ────────────────────────────────────────────────────────
  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        // The class triggers our CSS rules in collaboration-cursors.css
        { class: 'author-highlight' },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      // 0 = "hole" — the mark's children go here (the actual text node)
      0,
    ]
  },

  // ── ProseMirror Plugin ───────────────────────────────────────────────────
  //
  // This plugin intercepts every committed ProseMirror transaction and:
  //   1. Skips any transaction that came from Yjs (remote update) — those
  //      already have the correct marks embedded in the Yjs update payload.
  //   2. For local user transactions that insert text, it appends a new
  //      transaction that applies this mark to the just-inserted range.
  //
  // We use `appendTransaction` rather than `transformTransaction` because
  // we want to act AFTER the document change is committed, with full
  // knowledge of the final positions in the new document state.
  addProseMirrorPlugins() {
    // Capture user options at plugin-creation time via closure.
    // These values are stable for the entire session.
    const { userId, userName, userColor } = this.options
    const markType = this.type

    return [
      new Plugin({
        appendTransaction(transactions, _oldState, newState) {
          // ── Guard: skip if no local changes were made ──────────────────
          //
          // We only want to annotate insertions made by THE LOCAL USER.
          // Yjs remote transactions carry the 'y-sync$' plugin meta key,
          // which we use as a discriminator.
          //
          // We also skip transactions that WE already created in a previous
          // appendTransaction call (tagged with 'authorHighlightApplied') to
          // prevent infinite recursion.
          const hasLocalInsertion = transactions.some((tr) => {
            if (!tr.docChanged) return false
            // Yjs-originated transactions — skip
            if (tr.getMeta('y-sync$')) return false
            // Our own mark-application transactions — skip
            if (tr.getMeta('authorHighlightApplied')) return false
            return true
          })

          if (!hasLocalInsertion || !userId) return null

          // Build the new transaction that will ADD our authorship mark
          const resultTr = newState.tr
          let appliedAny = false

          for (const transaction of transactions) {
            // Same guards as above, per-transaction
            if (!transaction.docChanged) continue
            if (transaction.getMeta('y-sync$')) continue
            if (transaction.getMeta('authorHighlightApplied')) continue

            for (const step of transaction.steps) {
              // We only care about ReplaceSteps (insertions / replacements).
              // ReplaceSteps have a `slice` property containing the inserted
              // content. AddMarkStep, RemoveMarkStep, etc. do NOT have `slice`.
              const s = step as any

              // Type-safe duck-typing check — avoids importing ReplaceStep
              if (typeof s.from !== 'number' || !s.slice) continue

              // How many characters (or nodes) were inserted?
              // If zero, this is a pure deletion — nothing to mark.
              const insertedSize: number = s.slice?.content?.size ?? 0
              if (insertedSize === 0) continue

              // `transaction.mapping` is the composition of all steps in this
              // transaction. Mapping `step.from` through it gives us where
              // the insert point ended up in the NEW (post-transaction) document.
              const newFrom: number = transaction.mapping.map(s.from as number)
              const newTo: number = newFrom + insertedSize

              // Safety: don't try to mark beyond document bounds
              if (newFrom >= newTo || newTo > newState.doc.content.size) continue

              const mark = markType.create({
                authorId: userId,
                authorName: userName,
                authorColor: userColor,
              })

              // `addMark` is smart: it only applies the mark to inline content
              // (text nodes, inline elements). It silently skips block boundaries
              // and non-markable content (e.g. horizontal rules, images).
              resultTr.addMark(newFrom, newTo, mark)
              appliedAny = true
            }
          }

          if (!appliedAny) return null

          // Tag our transaction so `appendTransaction` doesn't process it
          // again on the next cycle (prevents infinite loops).
          resultTr.setMeta('authorHighlightApplied', true)

          return resultTr
        },
      }),
    ]
  },
})
