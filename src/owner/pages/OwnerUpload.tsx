import React, { useState, useRef } from "react";
import { useOwner } from "../owner-context";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Building2, MapPin, UploadCloud, Trash2, Sparkles, Star,
  Info, Shield, CheckCircle2, X, Loader2, Home, Check,
  Wifi, Wind, Dumbbell, Shirt, Fingerprint, Sunset, UtensilsCrossed,
  Bike, Car, Tv, Flame, Zap, User, Users, Coffee
} from "lucide-react";

// Modern premium color scheme with micro-animations & harmonized styling.
export function OwnerUpload() {
  const { addProperty } = useOwner();
  const navigate = useNavigate();
  
  // Adaptive Mode Selector ('pg' vs 'flat')
  const [propertyType, setPropertyType] = useState<"pg" | "flat">("pg");
  
  // Submitting States
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Image Upload State (Base64 string urls)
  const [photos, setPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Common Form Fields
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  
  // PG-Specific Form Fields
  const [pgSubtype, setPgSubtype] = useState("Co-living Space"); // Co-living Space, paying Guest (PG)
  const [genderCategory, setGenderCategory] = useState("Co-live (Mixed / Any)"); // Co-live (Mixed / Any), Boys Only, Girls Only
  const [sharingTypes, setSharingTypes] = useState<string[]>(["Double Sharing"]); // Single Sharing, Double Sharing, Triple Sharing, Four Sharing
  const [rentBasePrice, setRentBasePrice] = useState("");
  const [privateFloorPrice, setPrivateFloorPrice] = useState("");
  const [foodRating, setFoodRating] = useState(4);
  const [hygieneRating, setHygieneRating] = useState(4);
  const [pgAmenities, setPgAmenities] = useState<string[]>([
    "High-speed WiFi", "Air Conditioning", "Biometric Security"
  ]);
  const [gateRules, setGateRules] = useState("Gate curfew at 11:30 PM");
  const [securityInfo, setSecurityInfo] = useState("24/7 CCTV, Biometric gates");

  // Flat-Specific Form Fields
  const [flatSubtype, setFlatSubtype] = useState("Flat / Apartment"); // Flat / Apartment, Rented Flat, Independent House
  const [preferredTenants, setPreferredTenants] = useState("Co-live / Any"); // Co-live / Any, Families Only, Bachelors Only, Company Lease
  const [flatConfig, setFlatConfig] = useState("2 BHK"); // 1 BHK, 2 BHK, 3 BHK, 4 BHK, 1 RK, Studio Apartment
  const [monthlyRent, setMonthlyRent] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [furnishingLevel, setFurnishingLevel] = useState("Fully Furnished"); // Fully Furnished, Semi-Furnished, Unfurnished
  const [kitchenFacility, setKitchenFacility] = useState("Fully Functional Modular Kitchen"); // Fully Functional Modular Kitchen, Basic Kitchenette, No Cooking Allowed
  const [hygieneRatingFlat, setHygieneRatingFlat] = useState(4);
  const [flatAmenities, setFlatAmenities] = useState<string[]>([
    "High-speed WiFi", "Air Conditioning", "Modular Kitchen", "Washing Machine"
  ]);

  // Constants
  const pgAmenitiesOptions = [
    "High-speed WiFi", "Air Conditioning", "Fitness Center / Gym", 
    "Laundry Service", "Biometric Security", "Rooftop Lounge", 
    "Home Food (3 Meals)", "Two-wheeler Parking", "Daily housekeeping"
  ];
  
  const flatAmenitiesOptions = [
    "High-speed WiFi", "Air Conditioning", "Covered Parking", 
    "Washing Machine", "Modular Kitchen", "Attached Balcony", 
    "Geyser / Water Heater", "Power Backup"
  ];

  const sharingOptions = [
    "Single Sharing", "Double Sharing", "Triple Sharing", "Four Sharing"
  ];

  const sharingIconMap: Record<string, React.ComponentType<any>> = {
    "Single Sharing": User,
    "Double Sharing": Users,
    "Triple Sharing": Users,
    "Four Sharing": Users,
  };

  const amenityIconMap: Record<string, React.ComponentType<any>> = {
    "High-speed WiFi": Wifi,
    "Air Conditioning": Wind,
    "Fitness Center / Gym": Dumbbell,
    "Laundry Service": Shirt,
    "Biometric Security": Fingerprint,
    "Rooftop Lounge": Sunset,
    "Home Food (3 Meals)": UtensilsCrossed,
    "Two-wheeler Parking": Bike,
    "Covered Parking": Car,
    "Washing Machine": Tv,
    "Modular Kitchen": Coffee,
    "Attached Balcony": Sunset,
    "Geyser / Water Heater": Flame,
    "Power Backup": Zap,
    "Daily housekeeping": Sparkles,
  };

  // Helper to handle Multi-Image uploads & Base64 conversions
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach((file) => {
      // Type checking
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file.`);
        return;
      }
      // Size checking (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds the 10MB limit.`);
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setPhotos((prev) => [...prev, reader.result as string]);
          toast.success(`Uploaded ${file.name}`);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    toast.success("Image removed from gallery");
  };

  // One-Click Demo Prefill
  const handleDemoPrefill = () => {
    toast.success("Demo details prefilled successfully!");
    
    if (propertyType === "pg") {
      setName("Tranquil Nest Koramangala");
      setArea("Koramangala");
      setAddress("12th Main, Koramangala 4th Block, Bengaluru, Karnataka 560034");
      setDescription("Premium co-living facility designed for young professionals. High comfort, regular cleaning, healthy home-style meals, and a vibrant community.");
      setPgSubtype("Co-living Space");
      setGenderCategory("Co-live (Mixed / Any)");
      setSharingTypes(["Single Sharing", "Double Sharing"]);
      setRentBasePrice("15000");
      setPrivateFloorPrice("13500");
      setFoodRating(4);
      setHygieneRating(4);
      setPgAmenities(["High-speed WiFi", "Air Conditioning", "Laundry Service", "Daily housekeeping"]);
      setGateRules("Gate curfew at 11:30 PM");
      setSecurityInfo("24/7 guard, biometric gate");
      setPhotos([
        "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80"
      ]);
    } else {
      setName("Orchid Vista Residences");
      setArea("HSR Layout Sector 3");
      setAddress("Tower B-402, Orchid Vista, 24th Main Road, HSR Layout, Bengaluru 560102");
      setDescription("Stunning high-rise apartment offering cross-ventilation, outstanding society security protocols, covered parking spots, and close proximity to top tech parks.");
      setFlatSubtype("Flat / Apartment");
      setPreferredTenants("Bachelors Only");
      setFlatConfig("3 BHK");
      setMonthlyRent("48000");
      setSecurityDeposit("150000");
      setFurnishingLevel("Fully Furnished");
      setKitchenFacility("Fully Functional Modular Kitchen");
      setHygieneRatingFlat(4);
      setFlatAmenities(["High-speed WiFi", "Air Conditioning", "Covered Parking", "Washing Machine", "Modular Kitchen", "Attached Balcony", "Power Backup"]);
      setPhotos([
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"
      ]);
    }
  };

  // Submit Handler
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Required fields check
    if (!name.trim()) {
      toast.error("Property Name is required");
      return;
    }
    if (!area.trim()) {
      toast.error("Area/Locality is required");
      return;
    }
    if (!address.trim()) {
      toast.error("Detailed Address is required");
      return;
    }
    
    const rentVal = propertyType === "pg" ? rentBasePrice : monthlyRent;
    if (!rentVal || isNaN(Number(rentVal)) || Number(rentVal) <= 0) {
      toast.error(propertyType === "pg" ? "Rent Base Price is required" : "Monthly Rent is required");
      return;
    }

    setIsSubmitting(true);
    
    try {
      let finalDescription = description.trim();
      let finalSecurityInfo = securityInfo.trim();
      
      // Smart Formats for Flat Mode
      if (propertyType === "flat") {
        finalDescription = `[${furnishingLevel}] Kitchen: ${kitchenFacility}. ${description}`;
        const formattedDeposit = Number(securityDeposit).toLocaleString("en-IN");
        finalSecurityInfo = `${securityInfo ? securityInfo + " · " : ""}Deposit: ₹${formattedDeposit}`;
      }

      // Construct Payload
      const payload = {
        name: name.trim(),
        area: area.trim(),
        address: address.trim(),
        description: finalDescription,
        propertyType: propertyType === "pg" ? "pg" : "flat",
        photos: photos.length > 0 ? photos : ["/placeholder.svg"],
        amenities: propertyType === "pg" ? pgAmenities : flatAmenities,
        hygieneRating: propertyType === "pg" ? hygieneRating : hygieneRatingFlat,
        
        // PG fields
        ...(propertyType === "pg" && {
          pgSubtype,
          genderCategory,
          sharingTypes,
          basePrice: Number(rentBasePrice),
          privateFloorPrice: privateFloorPrice ? Number(privateFloorPrice) : undefined,
          foodRating,
          gateRules,
          securityInfo: finalSecurityInfo,
        }),
        
        // Flat fields
        ...(propertyType === "flat" && {
          flatSubtype,
          preferredTenants,
          flatConfig,
          basePrice: Number(monthlyRent),
          depositPrice: securityDeposit ? Number(securityDeposit) : undefined,
          securityInfo: finalSecurityInfo,
          foodRating: 0, // Automatically disabled/set to 0 for flats
          furnishingLevel,
          kitchenFacility,
        }),
      };

      await addProperty(payload);
      
      toast.success("Property published successfully!");
      
      // Delay before redirect (800ms)
      setTimeout(() => {
        navigate({ to: "/owner/inventory" });
      }, 800);
      
    } catch (err: any) {
      toast.error(err.message ?? "An error occurred while publishing.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner & Demo Prefill */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border rounded-xl p-5 shadow-sm">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-warning font-semibold mb-1">Owner Dashboard</div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Add Property Details</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Publish a new property in your portfolio. Fill in details tailored specifically for your property type.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDemoPrefill}
          className="flex items-center gap-1.5 px-4 py-2 border rounded-lg bg-background hover:bg-muted font-medium text-xs shadow-sm transition-all hover:scale-[1.02] shrink-0"
        >
          <Sparkles className="h-4 w-4 text-warning" />
          <span>One-Click Demo Prefill</span>
        </button>
      </div>

      {/* Step 1: Select Property Classification */}
      <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b pb-3 mb-4">
          <span className="h-7 w-7 rounded-full bg-warning/10 flex items-center justify-center text-warning shrink-0">
            <Building2 className="h-3.5 w-3.5" />
          </span>
          <h2 className="font-display text-sm font-bold text-slate-900">
            Step 1: Select Property Classification
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PG Mode Card */}
          <button
            type="button"
            onClick={() => setPropertyType("pg")}
            className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
              propertyType === "pg" 
                ? "bg-warning/5 border-warning ring-2 ring-warning/10 shadow-sm" 
                : "hover:bg-muted border-border"
            }`}
          >
            <div className={`p-2 rounded-lg shrink-0 ${propertyType === "pg" ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground"}`}>
              <Building2 className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="font-semibold text-sm text-slate-900">PG / Co-living Space</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Rented per-bed. Includes food services, operational rules, and premium community amenities.
              </p>
            </div>
          </button>

          {/* Flat Mode Card */}
          <button
            type="button"
            onClick={() => setPropertyType("flat")}
            className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
              propertyType === "flat" 
                ? "bg-warning/5 border-warning ring-2 ring-warning/10 shadow-sm" 
                : "hover:bg-muted border-border"
            }`}
          >
            <div className={`p-2 rounded-lg shrink-0 ${propertyType === "flat" ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground"}`}>
              <Home className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="font-semibold text-sm text-slate-900">Flat / Apartment / House</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Rented entire flat. Self-managed food, society protocols, covered parking, and balconies.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Visuals & Property Images */}
      <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b pb-3 mb-4">
          <span className="h-7 w-7 rounded-full bg-warning/10 flex items-center justify-center text-warning shrink-0">
            <UploadCloud className="h-3.5 w-3.5" />
          </span>
          <h2 className="font-display text-sm font-bold text-slate-900">
            Visuals & Property Images
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Uploader Input */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="md:col-span-1 border-2 border-dashed border-muted-foreground/20 hover:border-warning/50 rounded-xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[140px] bg-muted/20"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              multiple 
              accept="image/png, image/jpeg" 
              className="hidden" 
              onChange={handleImageChange}
            />
            <UploadCloud className="h-8 w-8 text-muted-foreground mb-2 animate-bounce" />
            <h4 className="font-medium text-xs">Select / Drag Photos</h4>
            <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
          </div>

          {/* Uploader Preview Tray */}
          <div className="md:col-span-2 flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {photos.length === 0 ? (
              <div className="w-full flex flex-col items-center justify-center p-4 border rounded-xl border-dashed min-h-[140px] text-muted-foreground text-xs">
                <Info className="h-5 w-5 mb-1.5 text-muted-foreground/60" />
                <span>No images uploaded yet.</span>
                <span className="text-[10px] opacity-70 mt-0.5">Use uploader or click "One-Click Demo Prefill".</span>
              </div>
            ) : (
              <div className="flex gap-3">
                {photos.map((url, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border w-[110px] h-[110px] shrink-0 shadow-sm bg-muted">
                    <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                    
                    {/* Cover badge */}
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-warning text-warning-foreground text-[8px] font-bold rounded shadow-sm">
                        Cover
                      </span>
                    )}

                    {/* Delete Hover Action */}
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                    >
                      <Trash2 className="h-5 w-5 hover:text-red-400 transition-colors" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Form Fields */}
      <form onSubmit={handlePublish} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* General Details (Left Card) */}
          <div className="md:col-span-7 bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b pb-3 mb-4">
              <span className="h-7 w-7 rounded-full bg-warning/10 flex items-center justify-center text-warning shrink-0">
                <Building2 className="h-3.5 w-3.5" />
              </span>
              <h2 className="font-display text-sm font-bold text-slate-900">
                General Details
              </h2>
            </div>

            {/* ADAPTIVE RENDER - PG MODE GENERAL */}
            {propertyType === "pg" ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-1">
                  <label className="text-xs font-semibold text-muted-foreground">Property Sub-Type</label>
                  <select 
                    value={pgSubtype}
                    onChange={(e) => {
                      const newSubtype = e.target.value;
                      setPgSubtype(newSubtype);
                      if (newSubtype === "Paying Guest (PG)" && genderCategory === "Co-live (Mixed / Any)") {
                        setGenderCategory("Boys Only");
                      }
                    }}
                    className="w-full text-sm border rounded-lg p-2.5 bg-background shadow-sm focus:ring-1 focus:ring-warning focus:border-warning"
                  >
                    <option value="Co-living Space">Co-living Space</option>
                    <option value="Paying Guest (PG)">Paying Guest (PG)</option>
                  </select>
                </div>

                <div className="space-y-1 col-span-1">
                  <label className="text-xs font-semibold text-muted-foreground">Gender Preference</label>
                  <select 
                    value={genderCategory}
                    onChange={(e) => setGenderCategory(e.target.value)}
                    className="w-full text-sm border rounded-lg p-2.5 bg-background shadow-sm focus:ring-1 focus:ring-warning focus:border-warning"
                  >
                    {pgSubtype === "Co-living Space" && (
                      <option value="Co-live (Mixed / Any)">Co-live (Mixed / Any)</option>
                    )}
                    <option value="Boys Only">Boys Only</option>
                    <option value="Girls Only">Girls Only</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Sharing Types Offered</label>
                  <div className="flex flex-wrap gap-2">
                    {sharingOptions.map((opt) => {
                      const checked = sharingTypes.includes(opt);
                      const IconComponent = sharingIconMap[opt] || User;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            if (checked) {
                              setSharingTypes((prev) => prev.filter((x) => x !== opt));
                            } else {
                              setSharingTypes((prev) => [...prev, opt]);
                            }
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                            checked 
                              ? "bg-warning/10 border-warning text-black" 
                              : "bg-background border-border hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          <IconComponent className={`h-3.5 w-3.5 ${checked ? "text-warning" : "text-muted-foreground/60"}`} />
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* ADAPTIVE RENDER - FLAT MODE GENERAL */
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Property Sub-Type</label>
                  <select 
                    value={flatSubtype}
                    onChange={(e) => setFlatSubtype(e.target.value)}
                    className="w-full text-sm border rounded-lg p-2.5 bg-background shadow-sm"
                  >
                    <option value="Flat / Apartment">Flat / Apartment</option>
                    <option value="Rented Flat">Rented Flat</option>
                    <option value="Independent House">Independent House</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Preferred Tenants</label>
                  <select 
                    value={preferredTenants}
                    onChange={(e) => setPreferredTenants(e.target.value)}
                    className="w-full text-sm border rounded-lg p-2.5 bg-background shadow-sm"
                  >
                    <option value="Co-live / Any">Co-live / Any</option>
                    <option value="Families Only">Families Only</option>
                    <option value="Bachelors Only">Bachelors Only</option>
                    <option value="Company Lease">Company Lease</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Flat Configuration</label>
                  <select 
                    value={flatConfig}
                    onChange={(e) => setFlatConfig(e.target.value)}
                    className="w-full text-sm border rounded-lg p-2.5 bg-background shadow-sm"
                  >
                    <option value="1 BHK">1 BHK</option>
                    <option value="2 BHK">2 BHK</option>
                    <option value="3 BHK">3 BHK</option>
                    <option value="4 BHK">4 BHK</option>
                    <option value="1 RK">1 RK</option>
                    <option value="Studio Apartment">Studio Apartment</option>
                  </select>
                </div>
              </div>
            )}

            {/* Common Location Fields */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Property Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Royal Meadows Residency" 
                  className="w-full text-sm border rounded-lg p-2.5 bg-background shadow-sm focus:ring-1 focus:ring-warning focus:border-warning" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Area / Locality <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. Koramangala 5th Block, HSR Layout" 
                  className="w-full text-sm border rounded-lg p-2.5 bg-background shadow-sm focus:ring-1 focus:ring-warning focus:border-warning" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Detailed Address <span className="text-red-500">*</span></label>
                <textarea 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. No 12, 1st Cross, Near Ganapathi Temple..." 
                  rows={2}
                  className="w-full text-sm border rounded-lg p-2.5 bg-background shadow-sm focus:ring-1 focus:ring-warning focus:border-warning resize-none" 
                />
              </div>
            </div>
          </div>

          {/* Pricing & Services (Right Card) */}
          <div className="md:col-span-5 bg-card border rounded-xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 border-b pb-3 mb-4">
                <span className="h-7 w-7 rounded-full bg-warning/10 flex items-center justify-center text-warning shrink-0">
                  <Shield className="h-3.5 w-3.5" />
                </span>
                <h2 className="font-display text-sm font-bold text-slate-900">
                  Pricing & Services
                </h2>
              </div>

              {/* ADAPTIVE RENDER - PG MODE PRICING */}
              {propertyType === "pg" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Rent Base Price ₹ <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={rentBasePrice}
                        onChange={(e) => setRentBasePrice(e.target.value)}
                        placeholder="e.g. 12000" 
                        className="w-full text-sm border rounded-lg p-2 bg-background shadow-sm"
                      />
                      <span className="text-[9px] text-muted-foreground/60 italic block mt-0.5">per bed / mo</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Private Floor Price ₹</label>
                      <input 
                        type="text" 
                        value={privateFloorPrice}
                        onChange={(e) => setPrivateFloorPrice(e.target.value)}
                        placeholder="e.g. 10000" 
                        className="w-full text-sm border rounded-lg p-2 bg-background shadow-sm"
                      />
                      <span className="text-[9px] text-muted-foreground/60 italic block mt-0.5">invisible to leads</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    {/* Food Quality Stars */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        Food Quality <Sparkles className="h-3 w-3 text-warning shrink-0" />
                      </label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setFoodRating(star)}
                            className="focus:outline-none"
                          >
                            <Star className={`h-4.5 w-4.5 ${star <= foodRating ? "fill-warning text-warning" : "text-muted-foreground/35"}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hygiene Rating Stars */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Hygiene Rating</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setHygieneRating(star)}
                            className="focus:outline-none"
                          >
                            <Star className={`h-4.5 w-4.5 ${star <= hygieneRating ? "fill-warning text-warning" : "text-muted-foreground/35"}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ADAPTIVE RENDER - FLAT MODE PRICING */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Monthly Rent ₹ <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={monthlyRent}
                        onChange={(e) => setMonthlyRent(e.target.value)}
                        placeholder="e.g. 30000" 
                        className="w-full text-sm border rounded-lg p-2 bg-background shadow-sm"
                      />
                      <span className="text-[9px] text-muted-foreground/60 italic block mt-0.5">per month / entire flat</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Security Deposit ₹</label>
                      <input 
                        type="text" 
                        value={securityDeposit}
                        onChange={(e) => setSecurityDeposit(e.target.value)}
                        placeholder="e.g. 80000" 
                        className="w-full text-sm border rounded-lg p-2 bg-background shadow-sm"
                      />
                      <span className="text-[9px] text-muted-foreground/60 italic block mt-0.5">refundable on exit</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Furnishing Level</label>
                      <select 
                        value={furnishingLevel}
                        onChange={(e) => setFurnishingLevel(e.target.value)}
                        className="w-full text-xs border rounded-lg p-2 bg-background shadow-sm"
                      >
                        <option value="Fully Furnished">Fully Furnished</option>
                        <option value="Semi-Furnished">Semi-Furnished</option>
                        <option value="Unfurnished">Unfurnished</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Kitchen Facility</label>
                      <select 
                        value={kitchenFacility}
                        onChange={(e) => setKitchenFacility(e.target.value)}
                        className="w-full text-xs border rounded-lg p-2 bg-background shadow-sm"
                      >
                        <option value="Fully Functional Modular Kitchen">Modular Kitchen</option>
                        <option value="Basic Kitchenette (Gas connection)">Basic Kitchenette</option>
                        <option value="No Cooking Allowed">No Cooking Allowed</option>
                      </select>
                    </div>
                  </div>

                  {/* Hygiene Rating Stars (Food disabled & set to 0 automatically) */}
                  <div className="space-y-1 pt-1.5">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      Hygiene Rating
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setHygieneRatingFlat(star)}
                          className="focus:outline-none"
                        >
                          <Star className={`h-4.5 w-4.5 ${star <= hygieneRatingFlat ? "fill-warning text-warning" : "text-muted-foreground/35"}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 border-t pt-4 text-[10px] text-muted-foreground flex items-start gap-1.5 leading-relaxed bg-muted/30 p-2.5 rounded-lg border">
              <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <span>
                All pricing metrics will sync securely. Pricing & Star scores will be instantly reflected on the occupant dashboards.
              </span>
            </div>
          </div>
        </div>

        {/* Society Guidelines, Rules & Operational details */}
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b pb-3 mb-4">
            <span className="h-7 w-7 rounded-full bg-warning/10 flex items-center justify-center text-warning shrink-0">
              <Shield className="h-3.5 w-3.5" />
            </span>
            <h2 className="font-display text-sm font-bold text-slate-900">
              {propertyType === "pg" ? "Minute Operational Details" : "Society Guidelines & Rules"}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  {propertyType === "pg" ? "Curfew & Gate Rules" : "Society Curfew Guidelines"}
                </label>
                <input 
                  type="text" 
                  value={gateRules}
                  onChange={(e) => setGateRules(e.target.value)}
                  placeholder={propertyType === "pg" ? "e.g. 11 PM gate locks" : "e.g. Visitors restricted after 10 PM"}
                  className="w-full text-sm border rounded-lg p-2.5 bg-background shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  {propertyType === "pg" ? "Security Protocol" : "Visitor Registration details"}
                </label>
                <input 
                  type="text" 
                  value={securityInfo}
                  onChange={(e) => setSecurityInfo(e.target.value)}
                  placeholder={propertyType === "pg" ? "e.g. 24/7 guard, biometric gate" : "e.g. Visitor entry logs via MyGate app"}
                  className="w-full text-sm border rounded-lg p-2.5 bg-background shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1 flex flex-col h-full">
              <label className="text-xs font-semibold text-muted-foreground">
                {propertyType === "pg" ? "Property Description" : "Flat / Apartment Description"}
              </label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe unique facilities, environment, room specs or specific house policies..."
                className="w-full flex-1 text-sm border rounded-lg p-2.5 bg-background shadow-sm resize-none min-h-[110px]"
              />
            </div>
          </div>
        </div>

        {/* Amenities Offered */}
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b pb-3 mb-4">
            <span className="h-7 w-7 rounded-full bg-warning/10 flex items-center justify-center text-warning shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <h2 className="font-display text-sm font-bold text-slate-900">
              Amenities Offered
            </h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(propertyType === "pg" ? pgAmenitiesOptions : flatAmenitiesOptions).map((amenity) => {
              const activeList = propertyType === "pg" ? pgAmenities : flatAmenities;
              const isSelected = activeList.includes(amenity);
              const IconComponent = amenityIconMap[amenity] || Sparkles;
              
              return (
                <button
                  type="button"
                  key={amenity}
                  onClick={() => {
                    const nextList = isSelected
                      ? activeList.filter((a) => a !== amenity)
                      : [...activeList, amenity];
                    if (propertyType === "pg") {
                      setPgAmenities(nextList);
                    } else {
                      setFlatAmenities(nextList);
                    }
                  }}
                  className={`flex items-center gap-2.5 p-3 rounded-lg border text-left text-xs transition-all ${
                    isSelected 
                      ? "bg-warning/10 border-warning text-black scale-[1.02]" 
                      : "bg-background border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <IconComponent className={`h-4.5 w-4.5 shrink-0 ${isSelected ? "text-warning" : "text-muted-foreground/60"}`} />
                  <span className="truncate">{amenity}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Publish Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/owner/inventory" })}
            className="px-6 py-2.5 border rounded-lg hover:bg-muted font-semibold text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-8 py-2.5 bg-warning hover:bg-warning/90 disabled:opacity-85 text-warning-foreground rounded-lg font-bold text-sm shadow-sm transition-all hover:scale-[1.02]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Publish Property</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
