import { Color } from "three";
import { IfcViewerAPI } from "web-ifc-viewer";
import { IFCLoader } from "web-ifc-three/IFCLoader";

const container = document.getElementById("viewer-container");
const viewer = new IfcViewerAPI({
  container,
  backgroundColor: new Color(0xffffff),
});
viewer.grid.setGrid();
viewer.axes.setAxes();

const input = document.getElementById("file-input");
const ifcLoader = new IFCLoader();

input.addEventListener("change", async (changed) => {
  const ifcURL = URL.createObjectURL(changed.target.files[0]);
  // const model = await ifcLoader.loadAsync(ifcURL);

  async function loadIfc(url) {
    await viewer.IFC.setWasmPath("../../../");
    const model = await viewer.IFC.loadIfcUrl(url);
    await viewer.shadowDropper.renderShadow(model.modelID);
    // viewer.context.renderer.postProduction.active = true;

    const ifcProject = await viewer.IFC.getSpatialStructure(model.modelID);
    console.log(ifcProject);
    createTreeMenu(ifcProject);
  }

  loadIfc(ifcURL);
});

// window.ondblclick = async () => await viewer.IFC.selector.pickIfcItem();

window.ondblclick = async () => {
  // const result = await viewer.IFC.selector.highlightIfcItem();
  const result = await viewer.IFC.selector.pickIfcItem();

  if (!result) return;
  const { modelID, id } = result;
  const props = await viewer.IFC.getProperties(modelID, id, true, false);
  console.log(props);
};

window.onmousemove = async () => await viewer.IFC.selector.prePickIfcItem();

// Tree view

const toggler = document.getElementsByClassName("caret");
for (let i = 0; i < toggler.length; i++) {
  toggler[i].onclick = () => {
    toggler[i].parentElement
      .querySelector(".nested")
      .classList.toggle("active");
    toggler[i].classList.toggle("caret-down");
  };
}

// Spatial tree menu

function createTreeMenu(ifcProject) {
  const root = document.getElementById("tree-root");
  removeAllChildren(root);
  const ifcProjectNode = createNestedChild(root, ifcProject);
  ifcProject.children.forEach((child) => {
    constructTreeMenuNode(ifcProjectNode, child);
  });
}

function nodeToString(node) {
  return `${node.type} - ${node.expressID}`;
}

function constructTreeMenuNode(parent, node) {
  const children = node.children;
  if (children.length === 0) {
    createSimpleChild(parent, node);
    return;
  }
  const nodeElement = createNestedChild(parent, node);
  children.forEach((child) => {
    constructTreeMenuNode(nodeElement, child);
  });
}

function createNestedChild(parent, node) {
  const content = nodeToString(node);
  const root = document.createElement("li");
  createTitle(root, content);
  const childrenContainer = document.createElement("ul");
  childrenContainer.classList.add("nested");
  root.appendChild(childrenContainer);
  parent.appendChild(root);
  return childrenContainer;
}

function createTitle(parent, content) {
  const title = document.createElement("span");
  title.classList.add("caret");
  title.onclick = () => {
    title.parentElement.querySelector(".nested").classList.toggle("active");
    title.classList.toggle("caret-down");
  };
  title.textContent = content;
  parent.appendChild(title);
}

function createSimpleChild(parent, node) {
  const content = nodeToString(node);
  const childNode = document.createElement("li");
  childNode.classList.add("leaf-node");
  childNode.textContent = content;
  parent.appendChild(childNode);

  childNode.onmouseenter = () => {
    viewer.IFC.selector.prepickIfcItemsByID(0, [node.expressID]);
  };

  childNode.onclick = async () => {
    viewer.IFC.selector.pickIfcItemsByID(0, [node.expressID]);
  };
}

function removeAllChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}
