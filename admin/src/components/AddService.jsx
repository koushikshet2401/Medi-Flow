import React, { useEffect, useRef, useState } from 'react'
import { addServiceStyles } from '../assets/dummyStyles'
import { AlertTriangle, CheckCircle, Clock, Plus, XCircle, Image, Trash2, Calendar } from 'lucide-react';

function AddService({ serviceId }) {
    const API_BASE = "https://medi-flow-backend.onrender.com";
    const fileRef = useRef(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [hasExistingImage, setHasExistingImage] = useState(false); //to update the image if found
    const [removeImage, setRemoveImage] = useState(false); //existing one 

    const [serviceName, setServiceName] = useState("");
    const [about, setAbout] = useState("");
    const [price, setPrice] = useState("");
    const [availability, setAvailability] = useState("available");

    const [instructions, setInstructions] = useState([""]);

    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);
    const [errors, setErrors] = useState({});

    //   to fetch services when in editing state
    useEffect(() => {
        let mounted = true;
        async function loadService() {
            if (!serviceId) return;
            try {
                const res = await fetch(`${API_BASE}/api/services/${serviceId}`);
                if (!res.ok) {
                    const txt = await res.text().catch(() => "");
                    console.warn("Failed to fetch service:", res.status, txt);
                    showToast(
                        "error",
                        "Load failed",
                        "Could not load service for editing."
                    );
                    return;
                }
                const payload = await res.json().catch(() => null);
                const data = payload?.data || payload;
                if (!data) return;
                if (!mounted) return;

                setServiceName(data.name || "");
                setAbout(data.about || data.description || "");
                setPrice(data.price != null ? String(data.price) : "");
                setAvailability(data.available ? "available" : "unavailable");
                setInstructions(
                    Array.isArray(data.instructions) && data.instructions.length
                        ? data.instructions
                        : [""]
                );
                if (data.imageUrl) {
                    setImagePreview(data.imageUrl);
                    setHasExistingImage(true);
                    setRemoveImage(false);
                } else {
                    setImagePreview(null);
                    setHasExistingImage(false);
                }
            } catch (err) {
                console.error("loadService error:", err);
                showToast("error", "Network error", "Could not load service.");
            }
        }
        loadService();
        return () => {
            mounted = false;
        };
    }, [serviceId, API_BASE]);

    function handleImageChange(e) {
        const f = e.target.files?.[0];
        if (!f) return;
        if (imagePreview && imagePreview.startsWith("blob:")) {
            try {
                URL.revokeObjectURL(imagePreview);
            } catch (err) { }
        }
        setImageFile(f);
        setImagePreview(URL.createObjectURL(f));
        //remove the exisitng image if user chooses a new file.
        setRemoveImage(false);
        setHasExistingImage(false);
    }

    //   instruction helpers
    function addInstruction() {
        setInstructions((s) => [...s, ""]);
    }
    function updateInstruction(i, v) {
        setInstructions((s) => s.map((x, idx) => (idx === i ? v : x)));
    }
    function removeInstruction(i) {
        setInstructions((s) => s.filter((_, idx) => idx !== i));
    }

    //reset the form back to inital state
    function resetForm() {
        if (imagePreview && imagePreview.startsWith("blob:")) {
            try {
                URL.revokeObjectURL(imagePreview);
            } catch (err) { }
        }
        setImagePreview(null);
        setImageFile(null);
        setHasExistingImage(false);
        setRemoveImage(false);
        setServiceName("");
        setAbout("");
        setPrice("");
        setAvailability("available");
        setInstructions([""]);
        setErrors({});
    }

    //   to show toast for 3.5sec
    function showToast(type, title, message) {
        setToast({ type, title, message });
        setTimeout(() => setToast(null), 3500);
    }



    //to validate that all fields are filled by user or not
    function validate() {
        const newErrors = {};
        if (!imageFile && !hasExistingImage) newErrors.image = true;
        if (!serviceName.trim()) newErrors.serviceName = true;
        if (!about.trim()) newErrors.about = true;
        if (!String(price).trim()) newErrors.price = true;
        if (!instructions.some((ins) => ins.trim())) newErrors.instructions = true;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    //submit function for creation or update
    async function handleSubmit(e) {
        e.preventDefault();
        if (!validate()) {
            showToast(
                "error",
                "Missing Fields",
                "Please fill all required fields before submitting."
            );
            return;
        }

        setSubmitting(true);

        try {
            const fd = new FormData();
            fd.append("name", serviceName);
            fd.append("about", about);
            const numericPrice = String(price).replace(/[^\d.-]/g, "");
            fd.append("price", numericPrice === "" ? "0" : numericPrice);
            fd.append("availability", availability);
            // arrays serialized as JSON
            fd.append("instructions", JSON.stringify(instructions));
            fd.append("slots", JSON.stringify([]));

            if (imageFile) {
                fd.append("image", imageFile);
            } else if (removeImage) {
                fd.append("removeImage", "true");
            }

            const url = serviceId
                ? `${API_BASE}/api/services/${serviceId}`
                : `${API_BASE}/api/services`;
            const method = serviceId ? "PUT" : "POST";

            const res = await fetch(url, { method, body: fd });
            const data = await res.json().catch(() => null);

            if (!res.ok) {
                const msg = data?.message || `Server error (${res?.status || "?"})`;
                showToast("error", "Save Failed", msg);
                setSubmitting(false);
                return;
            }

            showToast(
                "success",
                serviceId ? "Service Updated" : "Service Added",
                `${serviceName} saved successfully.`
            );

            if (!serviceId) {
                resetForm();
                if (fileRef.current) fileRef.current.value = null;
            } else {
                const saved = data?.data || null;
                if (saved) {
                    setHasExistingImage(Boolean(saved.imageUrl));
                    setImagePreview(saved.imageUrl || null);
                    setImageFile(null);
                    setRemoveImage(false);
                }
            }
        } catch (err) {
            console.error("service submit error:", err);
            showToast("error", "Network error", "Could not reach server.");
        } finally {
            setSubmitting(false);
        }
    }
    return (
        <div className={addServiceStyles.container.main}>
            <div className={addServiceStyles.toast.container}>
                {
                    toast && (
                        <div className={`${addServiceStyles.toast.toastBase} ${toast.type === "error" ? addServiceStyles.toast.toastError :
                            toast.type === "info" ? addServiceStyles.toast.toastInfo :
                                addServiceStyles.toast.toastSuccess
                            } animate-slideIn`}>
                            <div className={addServiceStyles.toast.iconContainer(toast.type)}>
                                {
                                    toast.type === "error" ? (
                                        <AlertTriangle className="w-5 h-5" />
                                    ) : toast.type === "info" ? (
                                        <Clock className="w-5 h-5" />
                                    ) : (
                                        <CheckCircle className="w-5 h-5" />
                                    )
                                }
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className={addServiceStyles.toast.title}>{toast.title}</div>
                                <div className={addServiceStyles.toast.message}>{toast.message}</div>
                            </div>
                            <button onClick={() => setToast(null)}>
                                <XCircle className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                            </button>
                        </div>
                    )}
            </div>
            <form onSubmit={handleSubmit} className={addServiceStyles.container.form}>
                <div className=" flex flex-col sm:flex-row items-start sm:items-center
                    justify-between mb-6 sm:mb-8 gap-4">
                    <div>
                        <h1 className={addServiceStyles.header.title}>
                            {serviceId ? "Edit Service" : "Add Service"}
                        </h1>
                        <p className={addServiceStyles.header.subtitle}>
                            Create a beautiful service card with unique time slots
                        </p>
                    </div>
                    <div className={addServiceStyles.headerActions}>
                        <button type="button" onClick={resetForm} className={addServiceStyles.buttons.reset}>
                            Reset
                        </button>
                        <button type="submit" disabled={submitting} className={addServiceStyles.buttons.submit}>
                            {submitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin">
                                        Saving...
                                    </div>
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    {serviceId ? "Update Service" : "Save Service"}
                                </>
                            )}

                        </button>
                    </div>
                </div>
                {/* left side */}
                <div className={addServiceStyles.grids.main}>
                    <div className=" lg:col-span-1 md:col-span-1 col-span-1 flex flex-col items-center">
                        <div className={addServiceStyles.imageUpload.container(errors.image)}>
                            <div className={addServiceStyles.imageUpload.preview}>
                                {imagePreview ? (
                                    <img src={imagePreview} alt='preview' className='w-full h-full object-cover' />
                                ) : (
                                    <div className={addServiceStyles.imageUpload.placeholder} >
                                        <Image className="w-10 h-10" />
                                        <div className="mt-2 text-sm">
                                            Service image (required)
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className=" w-full flex gap-2 items-center">
                                <input type="file" accept="image/*"
                                    ref={fileRef} onChange={handleImageChange}
                                    className='hidden'
                                />
                                <button type='button' onClick={() => fileRef.current?.click()}
                                    className={addServiceStyles.buttons.uploadImage}
                                >
                                    <Plus className="w-4 h-4" />{" "}
                                    {imagePreview ? "Replace Image" : "Upload Image"}

                                </button>
                                {(imagePreview || hasExistingImage) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            // If current preview is a blob URL, revoke it
                                            if (imagePreview && imagePreview.startsWith("blob:")) {
                                                try {
                                                    URL.revokeObjectURL(imagePreview);
                                                } catch (err) { }
                                            }
                                            setImagePreview(null);
                                            setImageFile(null);
                                            // mark that user wants to remove the existing image
                                            if (hasExistingImage) {
                                                setRemoveImage(true);
                                                setHasExistingImage(false);
                                            }
                                            if (fileRef.current) fileRef.current.value = null;
                                        }}
                                        className={addServiceStyles.buttons.removeImage}
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </button>
                                )}
                            </div>
                            {hasExistingImage && (
                                <div className="w-full text-xs text-gray-600 mt-2 flex items-center gap-2">
                                    <input
                                        id="remove-img"
                                        type="checkbox"
                                        checked={removeImage}
                                        onChange={(e) => {
                                            setRemoveImage(Boolean(e.target.checked));
                                            if (e.target.checked) {
                                                setImagePreview(null);
                                                setImageFile(null);
                                                setHasExistingImage(false);
                                            }
                                        }}
                                        className="rounded"
                                    />
                                    <label htmlFor="remove-img">Remove existing image</label>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* right side */}
                    {/* right column - main fields */}
                    <div className="lg:col-span-2 md:col-span-1 col-span-1 space-y-6">
                        <div className={addServiceStyles.grids.formFields}>
                            <div>
                                <label className={addServiceStyles.labels.standard}>
                                    Service name
                                </label>
                                <input
                                    value={serviceName}
                                    onChange={(e) => setServiceName(e.target.value)}
                                    placeholder="e.g. General Consultation"
                                    className={addServiceStyles.formFields.input(errors.serviceName)}
                                />
                            </div>

                            <div>
                                <label className={addServiceStyles.labels.standard}>
                                    Price
                                </label>
                                <input
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="₹ 499"
                                    className={addServiceStyles.formFields.input(errors.price)}
                                    inputMode="numeric"
                                />

                                <div className="mt-3">
                                    <label className={addServiceStyles.labels.standard}>
                                        Availability
                                    </label>
                                    <select
                                        value={availability}
                                        onChange={(e) => setAvailability(e.target.value)}
                                        className={addServiceStyles.formFields.select}
                                    >
                                        <option value="available">Available</option>
                                        <option value="unavailable">Unavailable</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className={addServiceStyles.labels.standard}>
                                About this service
                            </label>
                            <textarea
                                value={about}
                                onChange={(e) => setAbout(e.target.value)}
                                placeholder="Short description"
                                rows={4}
                                className={addServiceStyles.formFields.textarea(errors.about)}
                            />
                        </div>

                        {/* instructions */}
                        <div>
                            <div className="flex items-center justify-between">
                                <label className={addServiceStyles.labels.standard}>
                                    Instructions (point wise)
                                </label>
                                <button
                                    type="button"
                                    onClick={addInstruction}
                                    className={addServiceStyles.buttons.addInstruction}
                                >
                                    <Plus className="w-4 h-4" /> Add
                                </button>
                            </div>

                            <div
                                className={addServiceStyles.instructions.container(errors.instructions)}
                            >
                                {instructions.map((ins, idx) => (
                                    <div
                                        key={idx}
                                        className={addServiceStyles.instructions.item}
                                    >
                                        <div className={addServiceStyles.icon.number}>
                                            {idx + 1}.
                                        </div>
                                        <input
                                            value={ins}
                                            onChange={(e) => updateInstruction(idx, e.target.value)}
                                            placeholder={`Instruction ${idx + 1}`}
                                            className={addServiceStyles.instructions.input}
                                        />
                                        {instructions.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeInstruction(idx)}
                                                className={addServiceStyles.instructions.removeButton}
                                            >
                                                <Trash2 className={addServiceStyles.icon.removeInstruction} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </form>
            <style>{addServiceStyles.customCSS}</style>
        </div>
    );
};

export default AddService;