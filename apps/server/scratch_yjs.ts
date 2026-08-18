import * as Y from 'yjs';

const ydoc = new Y.Doc();
const xml = ydoc.getXmlFragment('default');
const p = new Y.XmlElement('paragraph');
const t = new Y.XmlText('Hello world from Git');
p.insert(0, [t]);
xml.insert(0, [p]);

console.log("Raw:", xml.toString());
console.log("Stripped:", xml.toString().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
