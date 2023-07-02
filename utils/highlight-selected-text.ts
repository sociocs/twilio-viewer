function removeHighlight() {
    const highlightedElements = document.querySelectorAll("mark");
    highlightedElements.forEach((element) => {
        const parent = element.parentNode;
        if (parent) {
            while (element.firstChild) {
                parent.insertBefore(element.firstChild, element);
            }
            parent.removeChild(element);
        }
    });
}

export function highlightSelectedText(parentNode: Node) {
    removeHighlight();

    const selection = window.getSelection();
    const selectedText = selection?.toString();
    if (!selectedText) {
        return;
    }

    const selectedRange = selection?.getRangeAt(0);
    const selectionParent = selectedRange?.commonAncestorContainer;

    const textNodes = getTextNodes(parentNode);

    textNodes.forEach((node) => {
        if (node == selectionParent) {
            return;
        }

        const nodeText = node.nodeValue;
        if (nodeText && nodeText.includes(selectedText)) {
            const regex = new RegExp(selectedText, "gi");
            const wrapper = document.createElement("mark");
            const highlightedText = nodeText.replace(
                regex,
                (match) => `<mark>${match}</mark>`
            );
            wrapper.innerHTML = highlightedText;
            while (wrapper.firstChild) {
                node.parentNode?.insertBefore(wrapper.firstChild, node);
            }
            node.parentNode?.removeChild(node);
        }
    });
}

function getTextNodes(parentNode: Node): Node[] {
    const textNodes: Node[] = [];
    function traverse(node: Node) {
        if (node.nodeType === Node.TEXT_NODE) {
            textNodes.push(node);
        } else {
            for (let i = 0; i < node.childNodes.length; i++) {
                traverse(node.childNodes[i]);
            }
        }
    }
    traverse(parentNode);
    return textNodes;
}
