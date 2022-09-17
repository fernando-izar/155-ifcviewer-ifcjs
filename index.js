import { Color } from "three";
import { IfcViewerAPI } from "web-ifc-viewer";
import { IFCLoader } from "web-ifc-three/IFCLoader";
import {
  IFCWALLSTANDARDCASE,
  IFCSLAB,
  IFCDOOR,
  IFCWINDOW,
  IFCFURNISHINGELEMENT,
  IFCMEMBER,
  IFCPLATE,
} from "web-ifc";

const container = document.getElementById("viewer-container");
const viewer = new IfcViewerAPI({
  container,
  backgroundColor: new Color(0xffffff),
});
viewer.grid.setGrid();
viewer.axes.setAxes();

const input = document.getElementById("file-input");
const ifcLoader = new IFCLoader();
ifcLoader.ifcManager.useWebWorkers(true, "./IFCWorker.js");

// async function setUpMultiThreading() {
//   const manager = ifcLoader.ifcManager;
//   await manager.useWebWorkers(true, "./IFCWorker.js");
// }
// setUpMultiThreading();

input.addEventListener("change", async (changed) => {
  const ifcURL = URL.createObjectURL(changed.target.files[0]);
  // const model = await ifcLoader.loadAsync(ifcURL);

  async function loadIfc(url) {
    await viewer.IFC.setWasmPath("../../../");
    const model = await viewer.IFC.loadIfcUrl(url);
    await viewer.shadowDropper.renderShadow(model.modelID);
    // viewer.context.renderer.postProduction.active = true;

    await setupAllCategories();

    const ifcProject = await viewer.IFC.getSpatialStructure(model.modelID);
    // console.log(ifcProject);
    createTreeMenu(ifcProject);
  }

  loadIfc(ifcURL);
});

setupProgressNotification();

function setupProgressNotification() {
  const text = document.querySelector(".progress-text");
  console.log("text", text);
  ifcLoader.ifcManager.setOnProgress((event) => {
    const percent = (event.loaded / event.total) * 100;
    const result = Math.trunc(percent);
    text.innerText = result.toString();
  });
}

// window.ondblclick = async () => await viewer.IFC.selector.pickIfcItem();

window.ondblclick = async () => {
  // const result = await viewer.IFC.selector.highlightIfcItem();
  const result = await viewer.IFC.selector.pickIfcItem();

  if (!result) return;
  const { modelID, id } = result;
  const props = await viewer.IFC.getProperties(modelID, id, true, false);
  // console.log(props);
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

const scene = viewer.context.getScene();
// console.log("scene", scene);

// List of categories names
const categories = {
  IFCWALLSTANDARDCASE,
  IFCSLAB,
  IFCFURNISHINGELEMENT,
  IFCDOOR,
  IFCWINDOW,
  IFCPLATE,
  IFCMEMBER,
};

// Gets the name of a category
function getName(category) {
  const names = Object.keys(categories);
  return names.find((name) => categories[name] === category);
}

// Gets the IDs of all the items of a specific category
async function getAll(category) {
  return viewer.IFC.loader.ifcManager.getAllItemsOfType(0, category, false);
}

// Creates a new subset containing all elements of a category
async function newSubsetOfType(category) {
  const ids = await getAll(category);
  return viewer.IFC.loader.ifcManager.createSubset({
    modelID: 0,
    scene,
    ids,
    removePrevious: true,
    customID: category.toString(),
  });
}

// Stores the created subsets
const subsets = {};

async function setupAllCategories() {
  const allCategories = Object.values(categories);
  for (let i = 0; i < allCategories.length; i++) {
    const category = allCategories[i];
    await setupCategory(category);
  }
}

// Creates a new subset and configures the checkbox
async function setupCategory(category) {
  subsets[category] = await newSubsetOfType(category);
  setupCheckBox(category);
}

// Sets up the checkbox event to hide / show elements
function setupCheckBox(category) {
  const name = getName(category);
  const checkBox = document.getElementById(name);
  checkBox.addEventListener("change", (event) => {
    const checked = event.target.checked;
    const subset = subsets[category];
    if (checked) scene.add(subset);
    else subset.removeFromParent();
  });
}
